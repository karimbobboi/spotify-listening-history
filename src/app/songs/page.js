"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "/src/app/page.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Row,
  Col,
  Button,
  ButtonGroup,
  Spinner,
  Image,
  Stack,
} from "react-bootstrap";
import NavBar from "/src/app/Components/NavBar";
import DynamicBackground from "/src/app/Components/DynamicBackground";

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

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months"];
  const [active_date, setActiveDate] = useState(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
  
    let most_played = null;
    let max_count = 0;
  
    for (const song in track_counts) {
      if (track_counts[song].count > max_count) {
        max_count = track_counts[song].count;
        most_played = track_counts[song];
      }
    }
  
    console.log(track_counts);
    console.log(most_played);

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
  
    return { most_played, songs_dict: sorted_songs };
  };

  const get_top_artist = () => {
    if (csv_data.length < 1) return;

    const track_counts = {};
    csv_data.forEach((track) => {
      const artists = track.artist.split("|");

      artists.forEach((artist) => {
        if (!track_counts[artist]) {
          track_counts[artist] = 0;
        }
        track_counts[artist]++;
      });
    });

    let most_played = null;
    let max_count = 0;

    for (const artist in track_counts) {
      if (track_counts[artist] > max_count) {
        max_count = track_counts[artist];
        most_played = artist;
      }
    }

    console.log(track_counts);

    return { artist: most_played, count: max_count };
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
        console.log(data);
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

  const handleSearchOnBlur = async () => {
    if(searchTerm.length > 0) {}
    else setIsSearchOpen(false);
  }

  const handleSearchBtnClicked = async () =>{
    setIsSearchOpen(!isSearchOpen);
  };

  const handleCancelClicked = async () => {
    setSearchTerm("");
    setIsSearchOpen(false);
  }

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

    if(start == null && end == null) {
      setData(raw_csv_data);
    }
    else if (start == end) {
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
        // if(most_played_song) setSongCounts(Object.values(most_played_song.songs_dict));
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
                <ButtonGroup className="" style={{ width: "fit-content" }}>
                  {date_filter.map((filter, index) => (
                    <button
                      className={date_filter[active_date] === filter 
                        ? "date-filter-btn filter-active fw-bold" 
                        : "date-filter-btn border-0 fw-light"}
                      onClick={() => handleDateFilterClicked(filter)}
                      key={index}
                      style={{
                        borderTopLeftRadius: index === 0 ? "0.5rem" : "0",
                        borderBottomLeftRadius: index === 0 ? "0.5rem" : "0",
                        borderTopRightRadius: index === (date_filter.length - 1) ? "0.5rem" : "0",
                        borderBottomRightRadius: index === (date_filter.length - 1) ? "0.5rem" : "0"
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </ButtonGroup>

                <div className="d-flex align-items-center">
                  <div className={`search-container pe-3 ps-3 rounded ${isSearchOpen ? "expanded" : ""}`}
                    style={{ 
                      fontSize: "0.9rem",
                      width: isSearchOpen ? "17rem" : "3rem",
                      backgroundColor: isSearchOpen ? "rgba(0, 0, 0, 0.3)" : "transparent",
                    }}
                  >
                    <button 
                      className="search-icon border-0 bg-transparent" 
                      onClick={() => handleSearchBtnClicked()}
                    >
                      <i className="bi bi-search text-light"></i>
                    </button>
                    {isSearchOpen && (
                      <>
                      <input autoFocus
                        type="text"
                        className="search-input form-control bg-transparent border-0 py-1 pe-0 w-100 text-light"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onBlur={() => handleSearchOnBlur()}
                        style={{
                          outline: "none",
                          boxShadow: "none",
                        }}
                      />
                      <button 
                      className="border-0 bg-transparent text-light py-0 ps-2" 
                      onClick={() => handleCancelClicked()}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                    </>
                    )}
                  </div>
                </div>
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
                className="table-container rounded h-100"
                style={{
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  maxHeight: "65vh",
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                {songCounts && songCounts.length > 0 ? (
                  <table
                    className={"table-borderless" + styles.tableCustom.className}
                    style={{
                      tableLayout: "fixed",
                      borderSpacing: "0.8rem",
                    }}
                  >
                    <thead
                      className="table-header"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "#fff",
                      }}
                    >
                      <tr className="border-bottom border-bottom-3 border-secondary" style={{ color: '#D6D6D6' }}>
                        <th className="fs-6 ps-2" style={{ width: "30%"}}>Track</th>
                        <th className="fs-6 ps-2" style={{ width: "35%"}}>Artist</th>
                        <th className="fs-6 ps-2" style={{ width: "30%" }}>Album</th>
                        <th className="fs-6 px-3 py-1" style={{ width: "5%" }}>Count</th>
                      </tr>
                    </thead>
                    <tbody
                      className="pb-2"
                      style={{
                        cursor: "pointer",
                        borderSpacing: "0 0.5rem",
                      }}
                    >
                      {songCounts
                        .toReversed()
                        .map((item, index) => (
                          <tr
                            className="border-0 pt-1"
                            key={index}
                            onClick={() => window.open(item.link, "_blank")}
                            style={{
                              backgroundColor: "transparent",
                              fontSize: "1.2rem",
                            }}
                          >
                            <td
                              className="text-light fw-bold"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: '22rem',
                                padding: "0.5rem", 
                              }}
                            >
                              {item.song}
                            </td>
                            <td
                              className="text-light fw-light"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: '20rem',
                                padding: "0.5rem",
                              }}
                            >
                              {item.artist.replaceAll("|", ", ")}
                            </td>
                            <td
                              className="text-light fw-light"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: '20rem',
                                padding: "0.5rem", 
                              }}
                            >
                              {item.album}
                            </td>
                            <td className="text-light text-center" style={{ padding: "0.5rem" }}>
                              {item.count}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center text-light h-100 d-flex align-items-center justify-content-center">
                    <p>No data available</p>
                  </div>
                )}
              </div>
            )}
              <Stack direction="horizontal" gap={3} className="py-3 px-1 d-flex">
                <button
                  className={`rounded p-0 ${styles.refreshBtn}`}
                  onClick={handleRefreshClicked} style={{ fontSize: "1.3rem" }}>
                  <i className="bi bi-arrow-repeat text-light"></i>
                </button>
                <p className="ms-auto my-auto"
                  style={{
                    color: '#EBEBEB',
                    fontWeight: '250',  
                  }}
                >{`Last updated: ${last_updated}`}</p>
              </Stack>
          </Col>

          <Col className="d-flex flex-column align-items-center bg-transparent p-0 pe-3" style={{ height: "100%" }}>
            <Stack
                className="d-flex align-items-center justify-content-center w-100 rounded"
                style={{
                  height: "50%",
                  minHeight: "22rem",
                  backgroundColor: "rgba(0,0,0,0.6)" 
                }}
              >
                {!topSong || !topSong.album?.images[0]?.url ? (
                  <p className="text-center text-light my-auto  ">No data available. Try refreshing.</p>
                ) : (
                  <Image
                    src={topSong.album.images[0].url}
                    className="rounded-top p-0"
                    style={{
                      width: "100%",
                      height: "22rem",
                      objectFit: "cover",
                    }}
                  />
                )}
                <Stack className="text-start fs-5 w-100 px-2 pt-1 pb-2">
                    {topSong && topSong.artists ? (
                        <>
                            <p className="fw-semibold text-white m-0">{topSong.name}</p>
                            <p className="fw-normal text-light m-0 fs-6" style={{color: '#EBEBEB'}}>
                              {topSong.artists?.map(artist => artist?.name).join(', ') + " • " + topSong.album.name + " • " + topSong.album.release_date.substring(0, 4)}
                            </p>
                        </>
                    ) : (<></>)
                  }
                </Stack>
              </Stack>
              <div
                className="mt-3 px-2 pb-2 rounded d-flex align-items-center justify-content-center"
                style={{
                  height: "100%",
                  width: "100%",
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                <Stack className="text-start fs-5 w-100">
                    <p className="fw-semibold text-warning m-0 mt-2">{`${songCounts.length} tracks`}</p>
                    <p className="fw-semibold text-warning m-0">
                    {`${songCounts.reduce((sum, song) => sum + song.count, 0)} plays`}
                    </p>
                </Stack>
              </div>
          </Col>
        </Row>
      </div>
    </main>
  );
}
