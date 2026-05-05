import { useMemo, useRef, useState } from 'react';

const DEFAULT_CSV_URL = '';

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
  if (key === 'video_url') return false;

  const values = rows.map((row) => row[key]).filter((value) => `${value}`.trim() !== '');
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

  const videoRefs = useRef({});

  const numericColumns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]).filter((key) => isNumericColumn(rows, key));
  }, [rows]);

  const filteredAndSortedRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    let filtered = rows;
    if (term) {
      filtered = rows.filter((row) =>
        Object.values(row).some((value) => `${value}`.toLowerCase().includes(term))
      );
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = Number(a[sortColumn]);
        const bValue = Number(b[sortColumn]);

        if (sortDirection === 'asc') {
          return aValue - bValue;
        }
        return bValue - aValue;
      });
    }

    return filtered;
  }, [rows, search, sortColumn, sortDirection]);

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

  return (
    <main className="container">
      <h1>Video Review App</h1>
      <p className="subtitle">
        Paste a public Google Sheets CSV URL, then browse and control all videos in one place.
      </p>

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
            placeholder="Search all metadata..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={sortColumn} onChange={(event) => setSortColumn(event.target.value)}>
            <option value="">Sort by numeric column</option>
            {numericColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
          <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="cards-grid">
        {filteredAndSortedRows.map((row) => {
          const { id, video_url: videoUrl, ...metadata } = row;
          const hasVideo = Boolean(videoUrl && videoUrl.trim());

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

              <dl className="metadata">
                <div className="metadata-item">
                  <dt>video_url</dt>
                  <dd>{videoUrl || 'N/A'}</dd>
                </div>
                {Object.entries(metadata).map(([key, value]) => (
                  <div className="metadata-item" key={key}>
                    <dt>{key}</dt>
                    <dd>{value || 'N/A'}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </section>

      {rows.length > 0 && filteredAndSortedRows.length === 0 ? (
        <p className="empty-state">No rows matched your search.</p>
      ) : null}
    </main>
  );
}
