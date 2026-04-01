import React, { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [history, setHistory] = useState([]); // ✅ NEW
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const debounceRef = useRef(null);

  // 🔍 Autocomplete
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    clearTimeout(debounceRef.current);

    if (!value) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/autocomplete?q=${value}`
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setSuggestions([]);
      }
    }, 300);
  };

  // 🔍 Search
  const handleSearch = async (searchValue) => {
    const q = searchValue || query;
    if (!q) return;

    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:5000/api/search?q=${q}`,
        {
          headers: {
            Authorization: token || "",
          },
        }
      );

      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);

      // ✅ refresh history after search
      if (token) fetchHistory();
    } catch (err) {
      console.error(err);
      setResults([]);
    }

    setLoading(false);
  };

  // 🔥 Trending
  const fetchTrending = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/trending");
      const data = await res.json();

      if (Array.isArray(data)) {
        setTrending(data);
      } else if (Array.isArray(data.trending)) {
        setTrending(data.trending);
      } else {
        setTrending([]);
      }
    } catch (err) {
      console.error(err);
      setTrending([]);
    }
  };

  // 🕘 History
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/history", {
        headers: {
          Authorization: token || "",
        },
      });

      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchTrending();
    if (token) fetchHistory();
  }, [token]);

  // ✨ Highlight
  const highlightText = (text, keyword) => {
    if (!keyword) return text;

    const regex = new RegExp(`(${keyword})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} style={{ background: "#facc15", color: "#000" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div style={styles.container}>
      {/* 🔐 AUTH */}
      <div style={styles.topbar}>
        {token ? (
          <>
            <span>✅ Logged In</span>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.reload();
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <span>❌ Not Logged In</span>
        )}
      </div>

      <h1 style={styles.title}>🔍 Smart Search System</h1>

      {/* 🔎 SEARCH */}
      <div style={styles.searchBox}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search..."
          style={styles.input}
        />
        <button onClick={() => handleSearch()} style={styles.button}>
          Search
        </button>
      </div>

      {/* ⚡ AUTOCOMPLETE */}
      {suggestions.length > 0 && (
        <ul style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => {
                setQuery(s);
                handleSearch(s);
                setSuggestions([]);
              }}
              style={{ cursor: "pointer" }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {/* 🔥 TRENDING */}
      <h2 style={styles.section}>🔥 Trending</h2>
      {Array.isArray(trending) && trending.length > 0 ? (
        <ul>
          {trending.map((item, i) => (
            <li
              key={i}
              onClick={() => handleSearch(item.query)}
              style={{ cursor: "pointer" }}
            >
              {item.query} ({item.count})
            </li>
          ))}
        </ul>
      ) : (
        <p>No trending data</p>
      )}

      {/* 🕘 HISTORY */}
      <h2 style={styles.section}>🕘 Your History</h2>
      {history.length > 0 ? (
        <ul>
          {history.map((item, i) => (
            <li
              key={i}
              onClick={() => handleSearch(item.query)}
              style={{ cursor: "pointer" }}
            >
              {item.query}
            </li>
          ))}
        </ul>
      ) : (
        <p>No history yet</p>
      )}

      {/* 📊 DASHBOARD */}
      <h2 style={styles.section}>📊 Dashboard</h2>
      <div style={styles.dashboard}>
        {Array.isArray(trending) &&
          trending.map((item, i) => (
            <div key={i} style={styles.statCard}>
              <h3>{item.query}</h3>
              <p>{item.count} searches</p>
              <button onClick={() => handleSearch(item.query)}>
                Search Again
              </button>
            </div>
          ))}
      </div>

      {/* 📈 CHART */}
      <h2 style={styles.section}>📈 Search Analytics</h2>
      <div style={{ width: "100%", height: "300px", minHeight: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={Array.isArray(trending) ? trending : []}>
            <XAxis dataKey="query" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 📊 RESULTS */}
      <h2 style={styles.section}>Results</h2>

      {loading ? (
        <p style={{ textAlign: "center" }}>⏳ Searching...</p>
      ) : results.length === 0 ? (
        <p style={{ textAlign: "center", color: "#94a3b8" }}>
          ❌ No results found
        </p>
      ) : (
        <div style={styles.resultsGrid}>
          {results.map((item) => (
            <div key={item.id} style={styles.card}>
              <h3>{highlightText(item.title, query)}</h3>
              <p>{highlightText(item.description, query)}</p>
              <small>{item.category}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "auto",
    padding: "20px",
    fontFamily: "Arial",
  },
  title: {
    textAlign: "center",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  searchBox: {
    display: "flex",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "10px",
  },
  button: {
    padding: "10px",
    cursor: "pointer",
  },
  suggestions: {
    listStyle: "none",
    padding: "10px",
    background: "#eee",
  },
  section: {
    marginTop: "20px",
  },
  resultsGrid: {
    display: "grid",
    gap: "15px",
  },
  card: {
    padding: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
  },
  dashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },
  statCard: {
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    textAlign: "center",
    background: "#f9fafb",
  },
};

export default App;