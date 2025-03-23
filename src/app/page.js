"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "/src/app/page.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSpotifyAuth from "/src/app/useSpotifyAuth.js";
import {
  Row,
  Col,
  Spinner,
  Image,
  Stack,
} from "react-bootstrap";
import NavBar from "/src/app/Components/NavBar";
import DynamicBackground from "/src/app/Components/DynamicBackground";
import DateFilter from "/src/app/Components/DateFilter";
import SearchBar from "/src/app/Components/SearchBar";

export default function Home() {
  const router = useRouter();
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raw_csv_data, setRawData] = useState([]);
  const [csv_data, setData] = useState([]);
  const [last_updated, setLast_updated] = useState("");
  const { access_token, getRefreshToken } = useSpotifyAuth();
  const [topSong, setTopSong] = useState(null);
  const [songCounts, setSongCounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [avgPlays, setAvgPlays] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(new Date());
  const [stats, setStats] = useState({
    uniqueArtists: 0,
    uniqueSongs: 0,
    uniqueAlbums: 0,
    topArtist: { name: '', count: 0 },
    mostActiveHour: { hour: 0, count: 0 }
  });

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months"];
  const [active_date, setActiveDate] = useState(null);

  const calculateStats = (data) => {
    const artists = new Set();
    const songs = new Set();
    const albums = new Set();
    const artistCounts = {};
    const hourCounts = Array(24).fill(0);

    data.forEach(track => {
      const trackArtists = track.artist.split("|");
      trackArtists.forEach(artist => {
        artists.add(artist);
        artistCounts[artist] = (artistCounts[artist] || 0) + (track.count || 1);
      });
      songs.add(track.song);
      albums.add(track.album);

      const hour = new Date(track[`${Object.keys(track)[0]}`]).getHours();
      hourCounts[hour] += (track.count || 1);
    });

    const topArtist = Object.entries(artistCounts)
      .sort(([,a], [,b]) => b - a)[0] || ['', 0];

    const mostActiveHour = hourCounts.reduce((max, count, hour) => 
      count > max.count ? { hour, count } : max,
      { hour: 0, count: 0 }
    );

    setStats({
      uniqueArtists: artists.size,
      uniqueSongs: songs.size,
      uniqueAlbums: albums.size,
      topArtist: { name: topArtist[0], count: topArtist[1] },
      mostActiveHour
    });
  };

  const filteredDates = () => {
    const today = new Date();
    let rangeStart = new Date(today);
    let rangeEnd = new Date(today);

    switch (date_filter[active_date]) {
      case "1 week":
        rangeStart.setDate(today.getDate() - 7);
        break;
      case "2 weeks":
        rangeStart.setDate(today.getDate() - 14);
        break;
      case "1 month":
        rangeStart.setMonth(today.getMonth() - 1);
        break;
      case "6 months":
        rangeStart.setMonth(today.getMonth() - 6);
        break;
      default:
        rangeStart = null;
        rangeEnd = null;
        break;
    }

    return [rangeStart, rangeEnd];
  };

  const calculateAveragePlays = () => {
    let [start, end] = filteredDates();
    if (csv_data.length < 1) return;
    else if (start == null || end == null){
      const date_time = `${Object.keys(csv_data[0])[0]}`;
      start = csv_data[0][date_time];
      end = csv_data[csv_data.length - 1][date_time];
    };

    const date1 = new Date(start);
    const date2 = new Date(end);
    const differenceInTime = date2 - date1;
    const numOfDays = differenceInTime / (1000 * 60 * 60 * 24);
    const totalPlays = songCounts.reduce((sum, track) => sum + track.count, 0);
    const averagePlays = totalPlays / numOfDays;
    setAvgPlays(averagePlays);

    setStartDate(date1.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
    setEndDate(date2.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  };

  const fetchRecentlyPlayed = async () => {
    if (!access_token) return;

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (response.status === 401) {
        console.log("Access token expired. Refreshing...");
        await getRefreshToken();
        return;
      }

      const data = await response.json();
      setRecentTracks(data.items || []);
    } catch (error) {
      console.error("Error fetching recently played tracks:", error);
    }
  };

  const get_most_played = () => {
    if (csv_data.length < 1) return;
  
    const track_counts = {};
    csv_data.forEach((track) => {
      const song = track.link;
      if (!track_counts[song]) {
        track_counts[song] = { ...track, count: 0 };
      }
      track_counts[song].count++;
    });

    const sorted_songs = Object.values(track_counts).sort(
      (a, b) => b.count - a.count
    );

    const searchTermLower = searchTerm.toLowerCase();
    const filtered_songs = searchTerm
      ? sorted_songs.filter(song => 
          song.song.toLowerCase().includes(searchTermLower) ||
          song.artist.toLowerCase().includes(searchTermLower) ||
          song.album.toLowerCase().includes(searchTermLower)
        )
      : sorted_songs;

    setSongCounts(filtered_songs);
  
    return { 
      most_played: sorted_songs[0],
      songs_dict: sorted_songs 
    };
  };

  const fetch_song_details = async (song) => {
    if (!access_token) return;
    try {
      const song_code = song?.includes("https://open.spotify.com/track/") ? song.substring(31) : "";
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${song_code}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      if (response) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error fetching track details:", error);
    }
    return;
  };

  const handleDownloadCSV = () => {
    if (!csv_data || csv_data.length === 0) return;
    
    const csvRows = csv_data.map(track => {
      const date = new Date(track[`${Object.keys(track)[0]}`]);
      return [
        `"${date.toISOString()}"`,
        `"${track.song}"`,
        `"${track.artist}"`,
        `"${track.album}"`,
        `"${track.link}"`,
        `"${new Date().toISOString()}"`
      ].join(',');
    });

    const csvContent = `"date_time","song","artist","album","link","last_updated"\n${csvRows.join('\n')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'spotify_listening_history.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefreshClicked = async () => {
    setLoading(true);
    const data = await fetchRecentlyPlayed();
    if (data) {
      setRecentTracks(data.items || []);
    }
    setLoading(false);
  };

  const handleDateFilterClicked = async (filter) => {
    if (date_filter[active_date] === filter) setActiveDate(null);
    else setActiveDate(date_filter.indexOf(filter));
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInMillis = now - date;
    const diffInMinutes = Math.floor(diffInMillis / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 7) {
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      } else {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
      }
    }

    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  useEffect(() => {
    fetchRecentlyPlayed();
  }, [access_token]);

  useEffect(() => {
    const postList = async () => {
      try {
        const response = await fetch("/api/listening-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items: recentTracks }),
        });

        if (!response.ok) {
          throw new Error("Failed to update the CSV file");
        }

        const result = await response.json();
        setRawData(result);
      } catch (error) {
        console.error("Error updating CSV:", error);
      }
    };

    if(recentTracks.length > 0) {
      setLast_updated(new Date().toLocaleString());
      setLoading(false);
    }

    postList();
  }, [recentTracks]);

  useEffect(() => {
    const [start, end] = filteredDates();
    if (start == end) {
      setData(raw_csv_data);
    } else {
      setData(
        raw_csv_data.filter((element) => {
          const date = element.date_time;
          return date >= start && date <= end;
        }),
      );
    }
  }, [raw_csv_data]);

  useEffect(() => {
    if (csv_data.length > 0) {
      calculateStats(csv_data);
      const fetchTopSong = async () => {
        const most_played = get_most_played();
        if (most_played?.most_played?.link) {
          const song = await fetch_song_details(most_played.most_played.link);
          setTopSong(song);
        }
      };
      fetchTopSong();
    }
  }, [csv_data]);

  useEffect(() => {
    const [start, end] = filteredDates();
    if (start < end) {
      const filteredData = raw_csv_data.filter((element) => {
        const date = new Date(element[`${Object.keys(element)[0]}`]);
        return date >= start && date <= end;
      });
      setData(filteredData);
    } else {
      setData(raw_csv_data);
    }
  }, [active_date]);

  useEffect(() => {
    get_most_played();
    if (songCounts.length > 0) {
      calculateStats(songCounts);
    }
  }, [searchTerm]);

  useEffect(() => {
    calculateAveragePlays();
  }, [songCounts]);

  useEffect(() => {
    console.log("topSong");console.log(topSong);
  }, [topSong])

  return (
    <main style={{ position: "relative", zIndex: 1, height: "100vh", overflow: "hidden" }}>
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Row className="" style={{ minHeight: "20vh" }}>
          <Col className="bg-transparent d-flex flex-column">
            <Row className="px-3 fs-5 pt-3 bg-transparent">
              <Col>
                <NavBar />
              </Col>
            </Row>

            <Row className="px-3 pt-5 flex-grow-1"></Row>
            
            <Row className="px-3 bg-transparent align-items-center">
              <Col sm={9} className="d-flex justify-content-between align-items-center py-2">
                <DateFilter 
                  date_filter={date_filter} 
                  active_date={active_date} 
                  handleDateFilterClicked={handleDateFilterClicked} 
                />
              </Col>

              <Col>
              </Col>
            </Row>
          </Col>
        </Row>

        <Row className="px-3 bg-transparent">
          <Col className="ps-3" sm={9}>
            <Stack gap={3} className="h-100">
              <Row className="g-3">
                <Col sm={3}>
                  <div className="rounded p-3 h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <h3 className="text-warning mb-0">{stats.uniqueArtists}</h3>
                    <p className="text-light mb-0">Artists</p>
                  </div>
                </Col>
                <Col sm={3}>
                  <div className="rounded p-3 h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <h3 className="text-warning mb-0">{stats.uniqueSongs}</h3>
                    <p className="text-light mb-0">Songs</p>
                  </div>
                </Col>
                <Col sm={3}>
                  <div className="rounded p-3 h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <h3 className="text-warning mb-0">{stats.uniqueAlbums}</h3>
                    <p className="text-light mb-0">Albums</p>
                  </div>
                </Col>
                <Col sm={3}>
                  <div className="rounded p-3 h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <h3 className="text-warning mb-0">{songCounts.reduce((sum, track) => sum + track.count, 0)}</h3>
                    <p className="text-light mb-0">Total Plays</p>
                  </div>
                </Col>
              </Row>

              <div className="rounded p-3 flex-grow-1 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="text-warning mb-0">Listening Activity</h5>
                  <div className="d-flex align-items-center">
                    <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                  </div>
                </div>
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center h-75">
                    <Spinner animation="border" variant="warning" />
                  </div>
                ) : (
                  <div className="overflow-auto" style={{ maxHeight: "calc(80vh - 200px)", overflowY: "auto",
                    scrollbarWidth: "none", }}>
                    {(searchTerm 
                      ? csv_data.filter(item => 
                          item.song.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.album.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      : csv_data
                    ).toReversed().map((item, index) => (
                      <div
                        key={index}
                        className="mb-2 p-2 rounded"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          cursor: "pointer",
                        }}
                        onClick={() => window.open(item.link, "_blank")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                        }}
                      >
                        <div className="text-light fw-semibold">{item.song}</div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-light opacity-75">{item.artist.replaceAll("|", ", ")}</span>
                          <small className="text-warning">{formatDate(item[`${Object.keys(item)[0]}`])}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Stack>
          </Col>

          <Col className="d-flex flex-column gap-3 bg-transparent p-0 pe-3">
            <div
              className="rounded overflow-hidden border border-dark"
              style={{
                flex: "0 0 auto",
                aspectRatio: "1/1",
                backgroundColor: !topSong ? "rgba(0,0,0,0.6)" : "transparent",
              }}
            >
              {!topSong || topSong.error ? (
                <div className="d-flex align-items-center justify-content-center h-100"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                >
                  <p className="text-light mb-0 text-center">No data available<br />Try refreshing the page</p>
                </div>
              ) : (
                <Image
                  src={topSong.album?.images[0]?.url}
                  className="w-100 h-100"
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>

            <div className="rounded p-3 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
              <div className="text-light">
                <p className="mb-2">
                  Most active at{" "}
                  <span className="text-warning">{stats.mostActiveHour.hour}:00</span>
                  <br />
                  <small className="opacity-75">
                    with {stats.mostActiveHour.count} plays
                  </small>
                </p>
                <p className="mb-2">
                  Top artist:{" "}
                  <span className="text-warning">{stats.topArtist.name}</span>
                  <br />
                  <small className="opacity-75">
                    {stats.topArtist.count} plays
                  </small>
                </p>
                <p className="mb-0">
                  Average plays:{" "}
                  <span className="text-warning">{avgPlays.toFixed(1)}</span>
                  <small className="opacity-75"> per day</small>
                </p>
              </div>
            </div>
            <Stack direction="horizontal" gap={2} className="px-2 py-2 rounded border border-dark"
              style={{ backgroundColor: "rgba(0,0,0,0.6)"}}
            >
              <button
                className={`rounded p-1 ${styles.refreshBtn}`}
                onClick={handleRefreshClicked} 
                title="Refresh listening history"
                style={{ 
                  fontSize: "1rem",
                  backgroundColor: "transparent",
                  border: "none",
                  transition: "opacity 0.2s ease-in-out",
                  color: 'rgba(255,255,255,0.5)'
                }}>
                <i className="bi bi-arrow-repeat"></i>
              </button>
              <button
                className={`rounded p-1 ${styles.refreshBtn}`}
                onClick={handleDownloadCSV}
                title="Download as CSV file"
                style={{ 
                  fontSize: "1rem",
                  backgroundColor: "transparent",
                  border: "none",
                  transition: "opacity 0.2s ease-in-out",
                  color: 'rgba(255,255,255,0.5)'
                }}>
                <i className="bi bi-file-earmark-arrow-down"></i>
              </button>
              <p className="ms-auto my-0 small text-light opacity-75"
                style={{
                  fontWeight: '250',  
                }}
              >
                {`Last updated: ${last_updated}`}
              </p>
            </Stack>
          </Col>
        </Row>
      </div>
    </main>
  );
}