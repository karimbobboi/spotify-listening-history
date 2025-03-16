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

export const clientId = process.env.NEXT_PUBLIC_clientId;
export const clientSecret = process.env.NEXT_PUBLIC_clientSecret;

export default function Artists() {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raw_csv_data, setRawData] = useState([]);
  const [csv_data, setData] = useState([]);

  const [last_updated, setLast_updated] = useState("");
  const { access_token, getRefreshToken } = useSpotifyAuth();
  const [topArtist, setTopArtist] = useState(null);
  const [artistCounts, setArtistCounts] = useState([]);

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months"];
  const [active_date, setActiveDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [avgPlays, setAvgPlays] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(new Date());
  const [selectedArtistIndex, setSelectedArtistIndex] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedArtistDetails, setSelectedArtistDetails] = useState(null);

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
    const totalPlays = artistCounts.reduce((sum, artist) => sum + artist.count, 0);
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
  
  const get_most_played_artist = () => {
    if (csv_data.length < 1) return;
  
    const artist_counts = {};
    csv_data.forEach((track) => {
      const artist = track.artist.split("|");
      artist.forEach((element) => {
        if (!artist_counts[element]) {
          artist_counts[element] = { 
            artist: element,
            song: track.song,
            link: track.link, 
            count: 0 
          };
        }
        artist_counts[element].count++;
      });
    });
  
    let most_played = null;
    let max_count = 0;

    for (const artist in artist_counts) {
      if (artist_counts[artist].count > max_count) {
        max_count = artist_counts[artist].count;
        most_played = artist_counts[artist];
      }
    }

    const sorted_artists = Object.values(artist_counts).sort(
      (a, b) => a.count - b.count
    );

    if(searchTerm.length > 0) {
      const artists = sorted_artists.filter((artist) => {
        artist.count > 1
        return artist.song.toLowerCase().includes(searchTerm.toLowerCase()) 
        || artist.artist.toLowerCase().includes(searchTerm.toLowerCase())}
      );

      setArtistCounts(Object.values(artists));
    }
    else setArtistCounts(Object.values(sorted_artists));
  
    return { most_played, artists_dict: sorted_artists };
  };

  const fetch_song_details = async (song) => {
    if (!access_token || !song) return;
    
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

  const fetch_artist_details = async (artist) => {
    if (!access_token || !artist || recentTracks.length < 1) return;
    
    try {
      const song_details = await fetch_song_details(artist?.link);
      const artist_details = song_details.artists.find((element) => element.name === artist.artist);
      const artist_id = artist_details.id;
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artist_id}`,
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
      console.error("Error fetching artist details:", error);
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

  const handleKeyDown = (event) => {
    if (!artistCounts.length) return;

    if (event.key === "ArrowDown") {
      setSelectedArtistIndex((prevIndex) =>
        prevIndex === null ? 0 : Math.min(prevIndex + 1, artistCounts.length - 1)
      );
    } else if (event.key === "ArrowUp") {
      setSelectedArtistIndex((prevIndex) =>
        prevIndex === null ? 0 : Math.max(prevIndex - 1, 0)
      );
    }
  };

  const get_most_played_songs = () => {
    if (csv_data.length < 1 || !selectedArtist) return;
  
    const track_counts = {};
    csv_data.forEach((track) => {
      const song = track.link;
      const artist = track.artist.split("|");
      if(artist.includes(selectedArtist.artist)){
        if (!track_counts[song]) {
          track_counts[song] = { ...track, count: 0 };
        }
        track_counts[song].count++;
      }
    });

    const sorted_songs = Object.values(track_counts).sort(
      (a, b) => a.count - b.count
    );

    return sorted_songs.reverse().slice(0, 5);
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
        console.log("Updated CSV:", result);
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
    const fetchTopArtist = async () => {
      if (csv_data.length > 0 && csv_data[0].link) {
        const most_played_artist = get_most_played_artist();
        const top_artist = await fetch_artist_details(most_played_artist.most_played);
        setTopArtist(top_artist);
      }
    };

    fetchTopArtist();
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
    get_most_played_artist();
  }, [searchTerm]);

  useEffect(() => {
    calculateAveragePlays();
    if(artistCounts.length > 0) setSelectedArtistIndex(0);
  }, [artistCounts]);

  useEffect(() => {
    if(selectedArtistIndex >= 0) {
      const artist = artistCounts[(artistCounts.length - selectedArtistIndex) - 1];
      setSelectedArtist(artist || null);
      console.log(artist);
    }
  }, [selectedArtistIndex]);

  const [selectedTopTrack, setSelectedTopTrack] = useState(null);
  useEffect(() => {
    const fetchAm = async () => {
      const song_list = get_most_played_songs();
      const song_details = await fetch_song_details(song_list[0]?.link);
      if(song_details) setSelectedTopTrack(song_details);
      console.log("song_details", song_details);
    }

    if(selectedArtist) {
      fetchAm();
    };
  }, [selectedArtist]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [artistCounts]);

  useEffect(() => {
    const fetchArtistDetails = async () => {
      if (selectedArtist) {
        const details = await fetch_artist_details(selectedArtist);
        setSelectedArtistDetails(details);
      }
    };

    fetchArtistDetails();
  }, [selectedArtist]);

  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Row className="" style={{ minHeight: "20vh" }}>
          <Col className="bg-transparent d-flex flex-column">
            <Row className="px-3 fs-5 pt-3 bg-transparent">
              <Col>
                <NavBar activeTab={"artists"} />
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

              <Col>
                  <p className="text-end fw-light text-warning fs-5 my-auto me-2">
                    {`${startDate} - ${endDate}`}
                  </p>
              </Col>
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
                {artistCounts && artistCounts.length > 0 ? (
                  <>
                    {/* Overview Stats Cards */}
                    <Col sm={12}>
                      <Row className="g-2 mb-2">
                        <Col sm={3} className="pe-2">
                          <div className="p-3 rounded h-100" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Total Artists</h5>
                            <h2 className="text-light mb-0">{artistCounts.length}</h2>
                            <p className="text-light opacity-75 mb-0 small">unique artists played</p>
                          </div>
                        </Col>
                        <Col sm={3} className="px-2">
                          <div className="p-3 rounded h-100" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Daily Average</h5>
                            <h2 className="text-light mb-0">{avgPlays.toFixed(1)}</h2>
                            <p className="text-light opacity-75 mb-0 small">artists per day</p>
                          </div>
                        </Col>
                        <Col sm={3} className="px-2">
                          <div className="p-3 rounded h-100" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Most Played</h5>
                            <h2 className="text-light mb-0">{artistCounts[artistCounts.length - 1]?.count}</h2>
                            <p className="text-light opacity-75 mb-0 small text-truncate">{artistCounts[artistCounts.length - 1]?.artist}</p>
                          </div>
                        </Col>
                        <Col sm={3} className="ps-2">
                          <div className="p-3 rounded h-100" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <h5 className="text-warning mb-1">Time Range</h5>
                            <p className="text-light mb-0">{startDate} - {endDate}</p>
                            <p className="text-light opacity-75 mb-0 small">listening period</p>
                          </div>
                        </Col>
                      </Row>
                    </Col>

                    {/* Artist List and Details */}
                    <Col sm={3} className="pe-2">
                      <div className="rounded" style={{ backgroundColor: "rgba(0,0,0,0.6)", maxHeight: "60vh", scrollbarWidth: "none", overflowY: "auto" }}>
                        <table className="table-borderless mb-0 w-100 h-100" style={{
                            tableLayout: "fixed", borderSpacing: "0.8rem", 
                            backgroundColor: "rgba(0,0,0,0.3)"
                            }}>
                          <thead>
                            <tr className="text-warning fw-semibold" style={{ fontSize: "1.1rem" }}>
                              <th className="border-0 ps-2">Artist</th>
                              <th className="text-end border-0 pe-2">Plays</th>
                            </tr>
                          </thead>
                          <tbody className="text-dark">
                            {artistCounts.toReversed().map((item, index) => (
                              <tr key={index} 
                                onClick={() => setSelectedArtistIndex(index)}
                                className={selectedArtistIndex === index ? 'selected' : ''}
                                style={{ 
                                  cursor: 'pointer',
                                  backgroundColor: selectedArtistIndex === index ? "rgba(255,255,255,0.1)" : "transparent"
                                }}>
                                <td className="text-light border-0 ps-2 py-1">{item.artist}</td>
                                <td className="text-warning text-end border-0 pe-2 py-1">{item.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Col>

                    {/* Selected Artist Details */}
                    <Col sm={6} className="px-2">
                      {selectedArtist && (
                        <div className="rounded h-100" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                          <div className="p-3">
                            <h3 className="text-light mb-1">{selectedArtist.artist}</h3>
                            
                            <div className="mb-1">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-light">Total Plays</span>
                                <span className="text-warning">{selectedArtist.count}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-light">% of Total</span>
                                <span className="text-warning">
                                  {((selectedArtist.count / csv_data.length) * 100).toFixed(1)}%
                                </span>
                              </div>
                              
                              {/* First Listen Information */}
                              <div className="mt-1 p-3 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                {(() => {
                                  const firstTrack = csv_data
                                    .find(track => track.artist.includes(selectedArtist.artist));
                                    const date_time = `${Object.keys(csv_data[0])[0]}`;
                                    console.log("firstTrack", firstTrack[date_time]);
                                  
                                  const uniqueTracks = new Set(
                                    csv_data
                                      .filter(track => track.artist.includes(selectedArtist.artist))
                                      .map(track => track.song)
                                  );

                                  return (
                                    <>
                                      <p className="text-light mb-1">First time you listened to</p>
                                      <p className="text-warning mb-1 fw-bold">{selectedArtist.artist}</p>
                                      <p className="text-light mb-1">was with the song</p>
                                      <p className="text-warning mb-1 fw-bold">{firstTrack?.song}</p>
                                      <p className="text-light mb-3">on {new Date(firstTrack[date_time]).toLocaleDateString("en-GB", 
                                        { 
                                          day: "numeric",
                                          month: "long",
                                          year: "numeric"
                                        }
                                      )}</p>
                                      
                                      <div className="border-top pt-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                                        <p className="text-light mb-1">You've listened to</p>
                                        <p className="text-warning mb-1 fw-bold">{uniqueTracks.size} unique tracks</p>
                                        <p className="text-light mb-1">by {selectedArtist.artist} since</p>
                                        <p className="text-warning mb-0 fw-bold">
                                          {new Date(firstTrack[date_time]).toLocaleDateString("en-GB", 
                                            { 
                                              month: "long",
                                              year: "numeric"
                                            }
                                          )}
                                        </p>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {topArtist && selectedArtist.artist === topArtist.name && (
                              <div>
                                <div className="mb-2">
                                  <span className="text-light">Genres</span>
                                  <div className="text-warning small">
                                    {topArtist.genres?.join(', ')}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Col>

                    <Col sm={3} className="ps-2">
                      <div>
                        {selectedArtistDetails && selectedArtistDetails.images && selectedArtistDetails.images.length > 0 && (
                          <div className="mb-1 rounded">
                            <Image
                              src={selectedArtistDetails.images[0].url}
                              width="100%"
                              height="276rem"
                              className="rounded mb-3"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                        )}
                        <div className="rounded p-2" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                          <h5 className="text-warning mb-2">Top Tracks</h5>
                          {get_most_played_songs()?.map((song, index) => (
                            <div key={index} className="d-flex justify-content-between align-items-center py-1">
                              <Stack direction="horizontal" className="my-auto" gap={2}>
                                <span className="text-light opacity-50" style={{fontSize: '1rem'}}>{`#${index + 1}`}</span>
                                  <div className="text-light text-truncate" style={{fontSize: '1.1rem', maxWidth: '250px'}}>
                                    {song.song}
                                  </div>
                                  <div className="text-light text-end opacity-50" style={{fontSize: '1rem'}}>
                                    {song.count} plays
                                  </div>
                                </Stack>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Col>
                  </>
                ) : (
                  <div className="text-center text-light h-100 d-flex align-items-center justify-content-center">
                    <p>No data available</p>
                  </div>
                )}
              </Row>
            )}
            
            <div className="d-flex align-items-center">
              <button
                className={`rounded p-0 ${styles.refreshBtn}`}
                onClick={handleRefreshClicked}
                style={{ fontSize: "1.3rem" }}>
                <i className="bi bi-arrow-repeat text-light"></i>
              </button>
              <p className="ms-auto my-auto text-light opacity-75">
                Last updated: {last_updated}
              </p>
            </div>
          </Col>
        </Row>
      </div>
    </main>
  );
}
