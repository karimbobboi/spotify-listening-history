"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "/src/app/page.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function Songs() {
  const router = useRouter();
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raw_csv_data, setRawData] = useState([]);
  const [csv_data, setData] = useState([]);
  const [last_updated, setLast_updated] = useState("");
  const [access_token, setAccessToken] = useState(null);
  const [topSong, setTopSong] = useState(null);
  const [songCounts, setSongCounts] = useState([]);
  const [isDescending, setIsDescending] = useState(true);

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months"];
  const [active_date, setActiveDate] = useState(null);

  // const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [avgPlays, setAvgPlays] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(new Date());

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
    const differenceInTime = date2 - date1; // Difference in milliseconds
    const numOfDays = differenceInTime / (1000 * 60 * 60 * 24); // Convert to days
    const totalPlays = songCounts.reduce((sum, track) => sum + track.count, 0);
    const averagePlays = totalPlays / numOfDays;
    setAvgPlays(averagePlays);

    setStartDate(date1.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
    setEndDate(date2.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  };

  const fetchRecentlyPlayed = async () => {
    if (!access_token) return;
    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/player/recently-played?limit=50",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      if (response) {
        if (response.status == 401) {
          console.log("api key expired.");
          router.push("/login");
        } else {
          const data = await response.json();
          return data;
        }
      }
    } catch (error) {
      console.error("Error fetching recently played tracks:", error);
    }

    return;
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
      (a, b) => a.count - b.count
    );

    if(searchTerm.length > 0) {
      const songs = sorted_songs.filter((song) => {
        song.count > 1
        return song.song.toLowerCase().includes(searchTerm.toLowerCase()) 
        || song.artist.toLowerCase().includes(searchTerm.toLowerCase())
        || song.album.toLowerCase().includes(searchTerm.toLowerCase());}
      );

      setSongCounts(Object.values(songs));
    }

    else setSongCounts(Object.values(sorted_songs));
  
    return { 
      most_played: sorted_songs[sorted_songs.length - 1], 
      songs_dict: sorted_songs };
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
      console.error("Error fetching recently played tracks:", error);
    }

    return;
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

  useEffect(() => {
    const getRecentlyPlayed = async () => {
      const data = await fetchRecentlyPlayed();
      if (data) {
        setRecentTracks(data.items || []);
      }
      setLoading(false);
    };

    const accessToken = localStorage.getItem("spotify_access_token");
    if (!accessToken) {
      console.log("no access token found");
      router.push("/login");
      return;
    } else {
      setAccessToken(accessToken);
    }

    getRecentlyPlayed();
    setLast_updated(new Date().toLocaleString());
  }, []);

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
        console.log("Updated CSV:", result);
      } catch (error) {
        console.error("Error updating CSV:", error);
      }
    };

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
    const fetchTopSong = async () => {
      if (csv_data.length > 0 && csv_data[0].link) {
        const most_played_song = get_most_played();
        const song = await fetch_song_details(most_played_song.most_played.link);
        setTopSong(song);
      }
    };

    fetchTopSong();
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
  }, [searchTerm]);

  useEffect(() => {
    calculateAveragePlays();
  }, [songCounts]);

  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Row className="" style={{ minHeight: "25vh" }}>
          <Col className="bg-transparent d-flex flex-column">
            <Row className="px-3 fs-5 pt-3 bg-transparent">
              <Col>
                <NavBar activeTab={"songs"} />
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

                <div className="d-flex align-items-center">
                  <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                </div>
              </Col>

              <Col>
                  <p className="text-end fw-light text-warning fs-5 my-auto me-2">
                    {`${startDate} - ${endDate}`}
                  </p>
              </Col>
            </Row>
          </Col>
        </Row>
        <Row className="px-3 py-1 bg-transparent">
          <Col className="px-3" sm={9} style={{ minHeight: "70vh" }}>
            {loading ? (
              <div className="bg-dark text-center position-relative h-100 mx-auto">
                <Spinner
                  className="position-absolute top-50"
                  animation="border"
                  variant="warning"
                />
              </div>
            ) : (
              <div
                className="table-container rounded border border-dark"
                style={{
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                <div
                  className="rounded"
                  style={{
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    maxHeight: "60vh",
                  }}
                >
                  {songCounts && songCounts.length > 0 ? (
                    <table
                      className="table-borderless w-100 mb-0"
                      style={{
                        tableLayout: "fixed",
                        borderCollapse: "separate",
                        borderSpacing: "0",
                      }}
                    >
                      <thead
                        className="sticky-top"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          backdropFilter: "blur(10px)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <tr style={{ color: '#D6D6D6' }}>
                          <th className="fs-6 ps-3 py-2 rounded-top-start" style={{ width: "5%" }}>#</th>
                          <th className="fs-6 ps-2 py-2" style={{ width: "30%" }}>Title</th>
                          <th className="fs-6 ps-2 py-2" style={{ width: "25%" }}>Artist</th>
                          <th className="fs-6 ps-2 py-2" style={{ width: "25%" }}>Album</th>
                          <th className="fs-6 pe-3 py-2 text-end rounded-top-end" style={{ width: "15%" }}>
                            <div className="d-flex justify-content-end align-items-center gap-2">
                              Plays
                              <button
                                className="btn btn-link p-0 m-0"
                                onClick={() => setIsDescending(!isDescending)}
                                style={{ 
                                  textDecoration: 'none',
                                  transition: 'transform 0.2s ease-in-out'
                                }}
                              >
                                <i className={`bi bi-sort-${isDescending ? 'down' : 'up'} text-warning opacity-75`}></i>
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isDescending ? songCounts.toReversed() : songCounts).map((item, index) => (
                          <tr 
                            key={index}
                            onClick={() => window.open(item.link, "_blank")}
                            style={{
                              backgroundColor: "transparent",
                              transition: "all 0.2s ease-in-out",
                              cursor: "pointer",
                            }}
                            className={`hover-opacity-80 ${index === (isDescending ? songCounts.length - 1 : 0) ? 'rounded-bottom' : ''}`}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <td className={`text-light opacity-50 ps-3 py-2 ${index === (isDescending ? songCounts.length - 1 : 0) ? 'rounded-bottom-start' : ''}`}>
                              {isDescending ? index + 1 : songCounts.length - index}
                            </td>
                            <td className="ps-2 py-2">
                              <div className="text-light fw-semibold" style={{fontSize: "1.1rem"}}>
                                {item.song}
                              </div>
                            </td>
                            <td className="ps-2 py-2">
                              <div className="text-light opacity-90">
                                {item.artist.replaceAll("|", ", ")}
                              </div>
                            </td>
                            <td className="ps-2 py-2">
                              <div className="text-light opacity-75">
                                {item.album}
                              </div>
                            </td>
                            <td className={`pe-3 py-2 text-end ${index === (isDescending ? songCounts.length - 1 : 0) ? 'rounded-bottom-end' : ''}`}>
                              <div className="text-warning fw-semibold">
                                {item.count}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center text-light h-100 d-flex align-items-center justify-content-center p-4 rounded">
                      <p className="mb-0">No songs found</p>
                    </div>
                  )}
                </div>
                <Stack direction="horizontal" gap={2} className="px-2 py-1">
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
                  <p className="ms-auto my-0 small text-light opacity-75"
                    style={{
                      fontWeight: '250',  
                    }}
                  >{`Last updated: ${last_updated}`}</p>
                </Stack>
              </div>
            )}
          </Col>

          <Col className="d-flex flex-column align-items-center bg-transparent p-0 pe-3" style={{ height: "100%" }}>
            <Stack
              className="d-flex align-items-center justify-content-center w-100 rounded border border-dark"
              style={{
                height: "50%",
                minHeight: "22rem",
                backgroundColor: "rgba(0,0,0,0.6)" 
              }}
            >
              {!topSong || !topSong.album?.images[0]?.url ? (
                <p className="text-center text-light my-auto">No data available. Try refreshing.</p>
              ) : (
                <Image
                  src={topSong.album.images[0].url}
                  className="rounded-top w-100"
                  style={{
                    height: "22rem",
                    objectFit: "cover",
                  }}
                />
              )}
              <Stack className="text-start fs-5 w-100 px-3 py-3">
                  {topSong && topSong.artists ? (
                      <>
                          <p className="fw-semibold text-white m-0 text-truncate" style={{maxWidth: '21rem'}}>{topSong.name}</p>
                          <p className="fw-normal text-light m-0 fs-6" style={{color: '#EBEBEB'}}>
                            {topSong.artists?.map(artist => artist?.name).join(', ') + " • " + topSong.album.name + " • " + topSong.album.release_date.substring(0, 4)}
                          </p>
                      </>
                  ) : (<></>)
                }
              </Stack>
            </Stack>
            <div
              className="mt-3 px-2 pb-2 rounded border border-dark d-flex align-items-center justify-content-center"
              style={{
                height: "100%",
                width: "100%",
                backgroundColor: "rgba(0,0,0,0.6)",
              }}
            >
              <Stack className="text-start fs-5 w-100 pt-1" gap={0}>
                <p className="fw-normal text-warning m-0 fs-5">{`${songCounts.length} tracks`}</p>
                <p className="fw-normal text-warning fs-5 m-0">
                {`${songCounts.reduce((sum, song) => sum + song.count, 0)} plays`}
                </p>
                <p className="fw-normal text-warning mb-0 fs-5">
                  {`${avgPlays.toFixed(2)} plays per day`}
                </p>
              </Stack>
            </div>
          </Col>
        </Row>
      </div>
    </main>
  );
}
