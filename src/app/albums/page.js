"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "/src/app/page.module.css";
import { useEffect, useState } from "react";
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
import SearchBar from "../Components/SearchBar";
import useSpotifyAuth from "/src/app/useSpotifyAuth.js";

export default function Albums() {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raw_csv_data, setRawData] = useState([]);
  const [csv_data, setData] = useState([]);
  const [last_updated, setLast_updated] = useState("");
  const { access_token, getRefreshToken } = useSpotifyAuth();
  const [albumCounts, setAlbumCounts] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedAlbumDetails, setSelectedAlbumDetails] = useState(null);
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [avgPlays, setAvgPlays] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(new Date());

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months"];
  const [active_date, setActiveDate] = useState(null);

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
    else if (start == null || end == null) {
      const date_time = `${Object.keys(csv_data[0])[0]}`;
      start = csv_data[0][date_time];
      end = csv_data[csv_data.length - 1][date_time];
    }

    const date1 = new Date(start);
    const date2 = new Date(end);
    const differenceInTime = date2 - date1;
    const numOfDays = differenceInTime / (1000 * 60 * 60 * 24);
    const totalPlays = albumCounts.reduce((sum, album) => sum + album.count, 0);
    const averagePlays = totalPlays / numOfDays;

    setAvgPlays(averagePlays);
    setStartDate(date1.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
    setEndDate(date2.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  };

  const get_most_played_albums = () => {
    if (csv_data.length < 1) return;
  
    const album_counts = {};
    csv_data.forEach((track) => {
      const album = track.album;
      if (!album_counts[album]) {
        album_counts[album] = { 
          album: album,
          artist: track.artist,
          song: track.song,
          link: track.link, 
          count: 0,
          tracks: new Set()
        };
      }
      album_counts[album].count++;
      album_counts[album].tracks.add(track.song);
    });
  
    const sorted_albums = Object.values(album_counts).sort(
      (a, b) => a.count - b.count
    );

    if(searchTerm.length > 0) {
      const albums = sorted_albums.filter((album) => 
        album.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
        album.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setAlbumCounts(Object.values(albums));
    }
    else setAlbumCounts(Object.values(sorted_albums));
  
    return sorted_albums;
  };

  const fetch_album_details = async (album) => {
    if (!access_token || !album?.link) return;
    
    try {
      const song_code = album.link.includes("https://open.spotify.com/track/") 
        ? album.link.substring(31) 
        : "";
      
      const track_response = await fetch(
        `https://api.spotify.com/v1/tracks/${song_code}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (track_response.ok) {
        const track_data = await track_response.json();
        const album_id = track_data.album.id;

        const album_response = await fetch(
          `https://api.spotify.com/v1/albums/${album_id}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        if (album_response.ok) {
          const album_data = await album_response.json();
          return album_data;
        }
      }
    } catch (error) {
      console.error("Error fetching album details:", error);
    }
    return null;
  };

  const get_album_tracks = () => {
    if (csv_data.length < 1 || !selectedAlbum) return [];
  
    const track_counts = {};
    csv_data.forEach((track) => {
      if(track.album === selectedAlbum.album) {
        if (!track_counts[track.song]) {
          track_counts[track.song] = { ...track, count: 0 };
        }
        track_counts[track.song].count++;
      }
    });

    return Object.values(track_counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const handleDateFilterClicked = (filter) => {
    if (date_filter[active_date] === filter) setActiveDate(null);
    else setActiveDate(date_filter.indexOf(filter));
  };

  const handleKeyDown = (event) => {
    if (!albumCounts.length) return;

    if (event.key === "ArrowDown") {
      setSelectedAlbumIndex((prevIndex) =>
        prevIndex === null ? 0 : Math.min(prevIndex + 1, albumCounts.length - 1)
      );
    } else if (event.key === "ArrowUp") {
      setSelectedAlbumIndex((prevIndex) =>
        prevIndex === null ? 0 : Math.max(prevIndex - 1, 0)
      );
    }
  };

  const handleRefreshClicked = async () => {
    setLoading(true);
    await fetchRecentlyPlayed();
    setLoading(false);
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
          // const date = element.date_time;
          const date = new Date(element[`${Object.keys(element)[0]}`]);
          return date >= start && date <= end;
        })
      );
    }
  }, [raw_csv_data, active_date]);

  // useEffect(() => {
  //   const [start, end] = filteredDates();
  //   if (start < end) {
  //     const filteredData = raw_csv_data.filter((element) => {
  //       const date = new Date(element[`${Object.keys(element)[0]}`]);
  //       return date >= start && date <= end;
  //     });
  //     setData(filteredData);
  //   } else {
  //     setData(raw_csv_data);
  //   }
  // }, [active_date]);

  useEffect(() => {
    get_most_played_albums();
  }, [csv_data, searchTerm]);

  useEffect(() => {
    calculateAveragePlays();
    if(albumCounts.length > 0) {
      setSelectedAlbumIndex(0);
      const album = albumCounts[albumCounts.length - 1];
      setSelectedAlbum(album);
    }
  }, [albumCounts]);

  useEffect(() => {
    if(selectedAlbumIndex >= 0) {
      const album = albumCounts[(albumCounts.length - selectedAlbumIndex) - 1];
      setSelectedAlbum(album || null);
    }
  }, [selectedAlbumIndex]);

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      if (selectedAlbum) {
        const details = await fetch_album_details(selectedAlbum);
        setSelectedAlbumDetails(details);
      }
    };

    fetchAlbumDetails();
  }, [selectedAlbum]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [albumCounts]);

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

  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Row className="" style={{ minHeight: "20vh" }}>
          <Col className="bg-transparent d-flex flex-column">
            <Row className="px-3 fs-5 pt-3 bg-transparent">
              <Col>
                <NavBar activeTab={"albums"} />
              </Col>
            </Row>

            <Row className="px-3 pt-2 flex-grow-1"></Row>
            
            <Row className="px-3 bg-transparent align-items-center">
              <Col sm={9} className="d-flex justify-content-between align-items-center py-2">
                <DateFilter 
                  date_filter={date_filter} 
                  active_date={active_date} 
                  handleDateFilterClicked={handleDateFilterClicked} 
                />

                <div className="d-flex align-items-center">
                  <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                </div>
              </Col>
              <Col></Col>
            </Row>
          </Col>
        </Row>

        <Row className="px-3 bg-transparent">
          <Col className="px-3" sm={12} style={{ minHeight: "70vh" }}>
            {loading ? (
              <div className="bg-dark text-center position-relative h-100 mx-auto">
                <Spinner
                  className="position-absolute top-50"
                  animation="border"
                  variant="warning"
                />
              </div>
            ) : (
              <Row className="g-1">
                {albumCounts && albumCounts.length > 0 ? (
                  <>
                    {/* Overview Stats Cards */}
                    <Col sm={12}>
                      <Row className="g-2 mb-2">
                        <Col sm={3} className="pe-2">
                          <div className="p-3 rounded h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Total Albums</h5>
                            <h2 className="text-light mb-0">{albumCounts.length}</h2>
                            <p className="text-light opacity-75 mb-0 small">unique albums played</p>
                          </div>
                        </Col>
                        <Col sm={3} className="px-2">
                          <div className="p-3 rounded h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Daily Average</h5>
                            <h2 className="text-light mb-0">{avgPlays.toFixed(1)}</h2>
                            <p className="text-light opacity-75 mb-0 small">album plays per day</p>
                          </div>
                        </Col>
                        <Col sm={3} className="px-2">
                          <div className="p-3 rounded h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Most Played</h5>
                            <h2 className="text-light mb-0">{albumCounts[albumCounts.length - 1]?.count}</h2>
                            <p className="text-light opacity-75 mb-0 small text-truncate">
                              {albumCounts[albumCounts.length - 1]?.album}
                            </p>
                          </div>
                        </Col>
                        <Col sm={3} className="ps-2">
                          <div className="p-3 rounded h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Time Range</h5>
                            <h2 className="text-light mb-0">{startDate} - {endDate}</h2>
                            <p className="text-light opacity-75 mb-0 small">listening period</p>
                          </div>
                        </Col>
                      </Row>
                    </Col>

                    {/* Album List */}
                    <Col sm={3} className="pe-2">
                      <div className="rounded border border-dark" 
                        style={{ backgroundColor: "rgba(0,0,0,0.6)", 
                          maxHeight: "60vh", scrollbarWidth: "none", overflowY: "auto" }}>
                        <table className="table-borderless mb-0 w-100 h-100" style={{
                            tableLayout: "fixed", borderSpacing: "0.8rem", 
                            backgroundColor: "rgba(0,0,0,0.3)"
                        }}>
                          <thead>
                            <tr className="text-warning fw-semibold" style={{ fontSize: "1.1rem" }}>
                              <th className="border-0 ps-2">Album</th>
                              <th className="text-end border-0 pe-2">Plays</th>
                            </tr>
                          </thead>
                          <tbody className="text-dark">
                            {albumCounts.toReversed().map((item, index) => (
                              <tr key={index} 
                                onClick={() => setSelectedAlbumIndex(index)}
                                className={selectedAlbumIndex === index ? 'selected' : ''}
                                style={{ 
                                  cursor: 'pointer',
                                  backgroundColor: selectedAlbumIndex === index ? "rgba(255,255,255,0.1)" : "transparent"
                                }}>
                                <td className="text-light border-0 ps-2 py-1 text-truncate">{item.album}</td>
                                <td className="text-warning text-end border-0 pe-2 py-1">{item.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Col>

                    {/* Selected Album Details */}
                    <Col sm={6} className="px-2">
                      {selectedAlbum && (
                        <div className="rounded h-100 border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)", maxHeight: "60vh", overflowY: "auto" }}>
                          <div className="p-3">
                            <h3 className="text-light mb-1">{selectedAlbum.album}</h3>
                            <p className="text-warning mb-2">{selectedAlbum.artist.split('|')[0]}</p>
                            
                            <div>
                              <div className="p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                <h5 className="text-warning mb-2">Most Played Tracks</h5>
                                {get_album_tracks()?.map((track, index) => (
                                  <div key={index} className="d-flex justify-content-between align-items-center py-1">
                                    <Stack direction="horizontal" className="my-auto" gap={2}>
                                      <span className="text-light opacity-50" style={{fontSize: '1rem'}}>{`#${index + 1}`}</span>
                                      <div className="text-light text-truncate" style={{fontSize: '1.1rem', maxWidth: '250px'}}>
                                        {track.song}
                                      </div>
                                      <div className="text-light text-end opacity-50" style={{fontSize: '1rem'}}>
                                        {track.count} plays
                                      </div>
                                    </Stack>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-2 p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                <div className="d-flex justify-content-between mb-2">
                                  <span className="text-light">Total Plays</span>
                                  <span className="text-warning">{selectedAlbum.count}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                  <span className="text-light">Unique Tracks Played</span>
                                  <span className="text-warning">{selectedAlbum.tracks.size}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <span className="text-light">% of Total Listening</span>
                                  <span className="text-warning">
                                    {((selectedAlbum.count / csv_data.length) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 rounded">
                                <div className="d-flex justify-content-between align-items-center p-2 rounded mb-2" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                  <div className="text-light">
                                    First time you listened to{' '}
                                    <span className="text-warning fw-bold">{selectedAlbum.album}</span>
                                    {' '}was on{' '}
                                    <span className="text-warning fw-bold">
                                      {(() => {
                                        if (!csv_data.length || !selectedAlbum) return '';
                                        const firstTrack = csv_data
                                          .find(track => track.album === selectedAlbum.album);
                                        if (!firstTrack) return '';
                                        return new Date(firstTrack[Object.keys(firstTrack)[0]]).toLocaleDateString("en-GB", { 
                                          day: "numeric",
                                          month: "long",
                                          year: "numeric"
                                        });
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Col>
                    <Col sm={3} className="ps-2">
                      <div>
                        {selectedAlbumDetails && selectedAlbumDetails.images && selectedAlbumDetails.images.length > 0 && (
                          <div className="mb-2 rounded d-flex justify-content-center align-items-cente border border-dark">
                            <Image
                              src={selectedAlbumDetails.images[0].url}
                              width="100%"
                              className="rounded"
                              style={{ 
                                objectFit: "contain",
                                aspectRatio: "1/1",
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                if (selectedAlbumDetails?.external_urls?.spotify) {
                                  window.open(selectedAlbumDetails.external_urls.spotify, '_blank');
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {selectedAlbumDetails && (
                        <div className="mt-3 p-2 rounded border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                          <div className="d-flex justify-content-between mb-2">
                            <span className="text-light">Release Date</span>
                            <span className="text-warning">
                              {new Date(selectedAlbumDetails.release_date).toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="text-light">Total Tracks</span>
                            <span className="text-warning">{selectedAlbumDetails.total_tracks}</span>
                          </div>
                        </div>
                      )}
                      <Stack direction="horizontal" gap={2} className="px-2 py-2 mt-2 rounded border border-dark" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                        <button
                          className={`rounded p-1 ${styles.refreshBtn}`}
                          onClick={handleRefreshClicked} 
                          title="Refresh listening history"
                          style={{ 
                            fontSize: "1rem",
                            backgroundColor: "transparent",
                            border: "none",
                            transition: "opacity 0.2s ease-in-out"
                          }}>
                          <i className="bi bi-arrow-repeat text-light"></i>
                        </button>
                        <button
                          className={`rounded p-1 ${styles.refreshBtn}`}
                          onClick={handleDownloadCSV}
                          title="Download as CSV file"
                          style={{ 
                            fontSize: "1rem",
                            backgroundColor: "transparent",
                            border: "none",
                            transition: "opacity 0.2s ease-in-out"
                          }}>
                          <i className="bi bi-file-earmark-arrow-down text-light"></i>
                        </button>
                        {selectedAlbumDetails?.external_urls?.spotify && (
                          <Image 
                            src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
                            width={18}
                            className="float-end mb-1 ms-1"
                            style={{ 
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(selectedAlbumDetails.external_urls.spotify, '_blank')}
                          />
                        )}
                        <p className="ms-auto my-0 small text-light opacity-75"
                          style={{
                            fontWeight: '250',  
                          }}
                        >{`Last updated: ${last_updated}`}</p>
                      </Stack>
                    </Col>
                  </>
                ) : (
                  <div className="text-center text-light h-100 d-flex align-items-center justify-content-center">
                    <p>No data available</p>
                  </div>
                )}
              </Row>
            )}
          </Col>
        </Row>
      </div>
    </main>
  );
}
