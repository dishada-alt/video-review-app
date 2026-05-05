import { useMemo, useRef, useState } from 'react';

const DEFAULT_CSV_URL = '';
const DEFAULT_PAGE_SIZE = 10;

const ALLOWED_COLUMNS = [
  'Ad ID',
  'Campaign Concept',
  'Impressions',
  'Clicks',
  'CTR',
  'Cost',
  'Revenue',
  'Profit',
  'Profit %',
  'CPC',
  'RPC',
  'RPA',
  'CPM',
  'RPM',
  'Sell Clicks',
  'Sell RPC',
  'Conversions',
  'Frequency',
  'Reach',
  'CPA',
  'CVR',
];

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must include headers and at least one row.');
  }

  const headers = parseCsvLine(lines[0]);

  if (!headers.includes('video_url')) {
    throw new Error('CSV must include a "video_url" column.');
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = { id: `${index}-${values[0] || 'row'}` };

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });

    return row;
  });
}

function isNumericColumn(rows, key) {
  if (key === 'video_url' || key === 'id') return false;

  const values = rows
    .map((row) => `${row[key] ?? ''}`.trim())
    .filter((value) => value !== '' && value !== '-');

  if (values.length === 0) return false;

  return values.every((value) => !Number.isNaN(Number(value)));
}

export default function App() {
  const [csvUrl, setCsvUrl] = useState(DEFAULT_CSV_URL);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);
  const [openMetadataIds, setOpenMetadataIds] = useState({});

  const videoRefs = useRef({});

  const availableColumns = useMemo(() => {
    if (rows.length === 0) return [];
    return ALLOWED_COLUMNS.filter((key) => key in rows[0]);
  }, [rows]);

  const filteredAndSortedRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    let filtered = rows;

    if (term) {
      filtered = rows.filter((row) =>
        ['video_url', ...availableColumns].some((column) =>
          `${row[column] ?? ''}`.toLowerCase().includes(term)
        )
      );
    }

    if (sortColumn) {
      const numericSort = isNumericColumn(rows, sortColumn);

      filtered = [...filtered].sort((a, b) => {
        const rawA = `${a[sortColumn] ?? ''}`.trim();
        const rawB = `${b[sortColumn] ?? ''}`.trim();

        // keep "-" visible and sorted to the end
        if (rawA === '-' && rawB === '-') return 0;
        if (rawA === '-') return 1;
        if (rawB === '-') return -1;

        if (numericSort) {
          const aNum = Number(rawA);
          const bNum = Number(rawB);
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const comparison = rawA.localeCompare(rawB, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [rows, search, sortColumn, sortDirection, availableColumns]);

  const visibleRows = useMemo(
    () => filteredAndSortedRows.slice(0, visibleCount),
    [filteredAndSortedRows, visibleCount]
  );

  const loadCsv = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(csvUrl.trim());
      if (!response.ok) {
        throw new Error(`Could not fetch CSV (status ${response.status}).`);
      }

      const csvText = await response.text();
      const parsedRows = parseCsv(csvText);

      setRows(parsedRows);
      setOpenMetadataIds({});
      setVisibleCount(pageSize);

      if (sortColumn && !parsedRows[0]?.[sortColumn]) {
        setSortColumn('');
      }
    } catch (err) {
      setRows([]);
      setError(err.message || 'Failed to load CSV.');
    } finally {
      setLoading(false);
    }
  };

  const controlAllVideos = (action) => {
    Object.values(videoRefs.current).forEach((videoElement) => {
      if (!videoElement) return;

      if (action === 'play') {
        videoElement.play().catch(() => {});
      }
      if (action === 'pause') {
        videoElement.pause();
      }
      if (action === 'reset') {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    });
  };

  const toggleMetadata = (id) => {
    setOpenMetadataIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="container">
      <h1>Video Review App</h1>

      <section className="panel">
        <label htmlFor="csvUrl">Google Sheets CSV URL</label>

        <div className="url-row">
          <input
            id="csvUrl"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/.../gviz/tq?tqx=out:csv"
            value={csvUrl}
            onChange={(event) => setCsvUrl(event.target.value)}
          />
          <button onClick={loadCsv} disabled={!csvUrl.trim() || loading}>
            {loading ? 'Loading...' : 'Load CSV'}
          </button>
        </div>

        <div className="controls">
          <button onClick={() => controlAllVideos('play')} disabled={rows.length === 0}>
            Play All
          </button>
          <button onClick={() => controlAllVideos('pause')} disabled={rows.length === 0}>
            Pause All
          </button>
          <button onClick={() => controlAllVideos('reset')} disabled={rows.length === 0}>
            Reset All
          </button>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="Search selected columns..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <label>
            Sort by
            <select value={sortColumn} onChange={(event) => setSortColumn(event.target.value)}>
              <option value="">Select column</option>
              {availableColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <label>
            Direction
            <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>

          <label>
            Load at once
            <input
              type="number"
              min="1"
              step="1"
              value={pageSize}
              onChange={(event) => {
                const next = Math.max(1, Number(event.target.value) || DEFAULT_PAGE_SIZE);
                setPageSize(next);
                setVisibleCount(next);
              }}
            />
          </label>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="cards-grid">
        {visibleRows.map((row) => {
          const { id, video_url: videoUrl } = row;
          const hasVideo = Boolean(videoUrl && videoUrl.trim());
          const isMetadataOpen = Boolean(openMetadataIds[id]);

          return (
            <article className="card" key={id}>
              {hasVideo ? (
                <video
                  controls
                  muted
                  preload="metadata"
                  ref={(element) => {
                    videoRefs.current[id] = element;
                  }}
                  onError={() => {
                    videoRefs.current[id] = null;
                  }}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support this video.
                </video>
              ) : (
                <div className="video-error">Missing video URL in this row.</div>
              )}

              <button className="info-btn" onClick={() => toggleMetadata(id)}>
                {isMetadataOpen ? 'Hide info' : 'i'}
              </button>

              {isMetadataOpen ? (
                <dl className="metadata">
                  {availableColumns.map((key) => (
                    <div className="metadata-item" key={key}>
                      <dt>{key}</dt>
                      <dd>{row[key] || '-'}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </article>
          );
        })}
      </section>

      {filteredAndSortedRows.length > visibleRows.length ? (
        <div className="load-more-wrap">
          <button onClick={() => setVisibleCount((count) => count + pageSize)}>Load more</button>
        </div>
      ) : null}

      {rows.length > 0 && filteredAndSortedRows.length === 0 ? (
        <p className="empty-state">No rows matched your search.</p>
      ) : null}
    </main>
  );
}