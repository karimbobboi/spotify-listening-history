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

export default function Artists() {
  const router = useRouter();
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raw_csv_data, setRawData] = useState([]);
  const [csv_data, setData] = useState([]);

  const [last_updated, setLast_updated] = useState("");
  const [access_token, setAccessToken] = useState(null);
  const [topArtist, setTopArtist] = useState(null);
  const [artistCounts, setArtistCounts] = useState([]);

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months"];
  const [active_date, setActiveDate] = useState(null);
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
    const totalPlays = artistCounts.reduce((sum, artist) => sum + artist.count, 0);
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
      console.log("fetching song detailssss", song);
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
    if (!access_token || !artist) return;
    
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
        const data = await response.json();console.log("artist details", data);
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
  }, [artistCounts]);

  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Row className="" style={{ minHeight: "25vh" }}>
          <Col className="bg-transparent d-flex flex-column">
            <Row className="px-3 fs-5 pt-3 bg-transparent">
              <Col>
                <NavBar activeTab={"artists"} />
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
                className="table-container rounded h-100"
                style={{
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  maxHeight: "65vh",
                  backgroundColor: "rgba(0,0,0,0.3)",
                }}
              >
                {artistCounts && artistCounts.length > 0 ? (
                  <table
                    className="table-borderless"
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
                        backgroundColor: "rgba(0, 0, 0, 0.4)",
                        color: "#fff",
                      }}
                    >
                      <tr className="" style={{ 
                        color: '#D6D6D6',
                      }}>
                        <th className="fs-6 ps-2" style={{ width: "70%"}}>Artist</th>
                        <th className="fs-6 ps-2" style={{ width: "30%" }}>Count</th>
                      </tr>
                    </thead>
                    <tbody
                      className="pb-2"
                      style={{
                        cursor: "pointer",
                        borderSpacing: "0 0.5rem",
                      }}
                    >
                      {artistCounts
                        .toReversed()
                        .map((item, index) => (
                          <tr 
                            className="border-0 pt-1"
                            key={index}
                            style={{
                              backgroundColor: "transparent",
                              fontSize: "1.2rem",
                            }}
                          >
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
                              {item.artist}
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
                {!topArtist || !topArtist?.images[0]?.url ? (
                  <p className="text-center text-light my-auto  ">No data available. Try refreshing.</p>
                ) : (
                  <Image
                    src={topArtist.images[0].url}
                    className="rounded-top p-0"
                    style={{
                      width: "100%",
                      height: "22rem",
                      objectFit: "cover",
                    }}
                  />
                )}
                <Stack className="text-start fs-5 w-100 px-2 pt-1 pb-2">
                    {topArtist ? (
                        <>
                            <p className="fw-semibold text-white m-0 text-truncate" style={{maxWidth: '21rem'}}>{topArtist.name}</p>
                            <p className="fw-normal text-light m-0 fs-6" style={{color: '#EBEBEB'}}>
                              {topArtist.genres?.join(' • ')}
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
                <Stack className="text-start fs-5 w-100 pt-1" gap={0}>
                  <p className="fw-normal text-warning m-0 fs-5">{`${artistCounts.length} artists`}</p>
                  <p className="fw-normal text-warning mb-0 fs-5">
                    {`${avgPlays.toFixed(2)} unique artists per day`}
                  </p>
                </Stack>
              </div>
          </Col>
        </Row>
      </div>
    </main>
  );
}
