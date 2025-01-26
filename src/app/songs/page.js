"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "/src/app/page.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Row,
  Col,
  Table,
  Button,
  ButtonGroup,
  Spinner,
  Image,
} from "react-bootstrap";
import NavBar from "/src/app/Components/NavBar";
import DynamicBackground from "/src/app/Components/DynamicBackground";

export default function Home() {
  const router = useRouter();
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raw_csv_data, setRawData] = useState([]);
  const [csv_data, setData] = useState([]);
  const [last_updated, setLast_updated] = useState("");
  const [access_token, setAccessToken] = useState(null);
  const [topSong, setTopSong] = useState(null);

  const date_filter = ["1 week", "2 weeks", "1 month", "6 months", "all time"];
  const [active_date, setActiveDate] = useState(date_filter.length - 1);

  const formatDate = (isoString) => {
    const date = new Date(isoString);

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredDates = () => {
    const today = new Date();
    const rangeStart = new Date(today);
    const rangeEnd = new Date(today);

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
        track_counts[song] = 0;
      }
      track_counts[song]++;
    });

    let most_played = null;
    let max_count = 0;

    for (const song in track_counts) {
      if (track_counts[song] > max_count) {
        max_count = track_counts[song];
        most_played = song;
      }
    }

    console.log(track_counts);

    return { song: most_played, count: max_count };
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
    const song_code = song.includes("https://open.spotify.com/track/")
      ? song.substring(31)
      : "";
    try {
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
      console.log("asdsad");
      setData(raw_csv_data);
    } else {
      console.log(start, end);
      console.log(active_date);
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
        const most_played = get_most_played();
        console.log(most_played);
        const most_played_artist = get_top_artist();
        console.log(most_played_artist);

        const song = await fetch_song_details(most_played.song);
        setTopSong(song);
      }
    };

    fetchTopSong();
  }, [csv_data]);

  useEffect(() => {
    const [start, end] = filteredDates();
    if (start < end) {
      const filteredData = raw_csv_data.filter((element) => {
        console.log(element.date_time);
        const date = new Date(element[`${Object.keys(element)[0]}`]);
        return date >= start && date <= end;
      });
      setData(filteredData);
    }
    console.log(csv_data.length);
    console.log(start, end);
  }, [active_date]);

  // if (loading){
  //   return (
  //     <div className='bg-danger' style={{backgroundColor: 'red'}}>
  //       <div className='bg-primary text-center position-relative h-100 mx-auto' style={{minHeight: '100vh'}}>
  //         <Spinner className='position-absolute top-50' animation="border" variant="warning"/>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    // <main
    //   className=""
      //   style={{
      //   height: '100vh',
      //   background: "rgb(0,10,20)",
      //   background: "linear-gradient(0deg, rgba(0,10,20,1) 27%, rgba(0,29,61,1) 71%, rgba(100,2,76,1) 98%)"
      // }}
    // >
    <main style={{ position: "relative", zIndex: 1 }}>
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 2 }}>
      <Row style={{ minHeight: "27vh" }}>
        <Col className="bg-transparent">
          <Row className="px-3 fs-5 pt-3 bg-transparent">
            <Col sm={2}>
              <button
                className={`rounded px-2 ${styles.refreshBtn}`}
                onClick={handleRefreshClicked}
              >
                <i className="bi bi-arrow-repeat text-light fs-2"></i>
              </button>
            </Col>
            <Col>
              <NavBar activeTab={"songs"} />
            </Col>
          </Row>

          <Row className="px-3 fs-5 bg-transparent">
            <ButtonGroup className="me-auto mb-3 w-50">
              {date_filter.map((filter, index) => {
                return (
                  <Button
                    variant={`outline-secondary ${date_filter[active_date] === filter ? "fw-bold" : ""}`}
                    size="sm"
                    className="mx-3 w-25 rounded-4"
                    onClick={() => setActiveDate(date_filter.indexOf(filter))}
                    active={date_filter[active_date] === filter}
                    key={index}
                  >
                    {filter}
                  </Button>
                );
              })}
            </ButtonGroup>
          </Row>
        </Col>
      </Row>

      <Row className="px-3 bg-transparent">
        <Col className="ps-3" sm={8} style={{ maxHeight: "70vh" }}>
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
              className="table-container border border-dark border-3 rounded h-100"
              style={{
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
            >
              <table
                className={"table-borderless " + styles.tableCustom.className}
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
                  <tr className="border-bottom border-bottom-3 border-secondary my-3">
                    <th className="fs-5">Played at</th>
                    <th className="fs-5">Track</th>
                    <th className="fs-5">Artist</th>
                    <th className="fs-5">Album</th>
                  </tr>
                </thead>
                <tbody
                  className="table-group-divider"
                  style={{ cursor: "pointer" }}
                >
                  {csv_data &&
                    csv_data.toReversed().map((item, index) => {
                      return (
                        <tr
                          className="border-0 pt-3"
                          key={index}
                          onClick={() => window.open(item.link, "_blank")}
                          style={{
                            backgroundColor: "transparent",
                          }}
                        >
                          <td className="text-light fw-light ps-2">
                            {formatDate(item[`${Object.keys(item)[0]}`])}
                          </td>
                          <td className="text-light">{item.song}</td>
                          <td className="text-light fw-light">
                            {item.artist.replaceAll("|", ", ")}
                          </td>
                          <td
                            style={{ maxWidth: "200px" }}
                            className="text-light fw-light pe-2 d-inline-block text-truncate"
                          >
                            {item.album}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Col>
        <Col>
          {!topSong ? (
            <></>
          ) : (
            <>
              <Row className="border-none">
                {topSong != null && topSong.album?.images[0].url ? (
                  <Image
                    className="p-0 border border-0 rounded"
                    src={topSong.album.images[0].url}
                    alt="Album Art"
                  />
                ) : (
                  <p>No album art available</p>
                )}
              </Row>
            </>
          )}

          <Row className="border-none">
            <div className="h-100 text-center w-100">
              <p className="fs-1 fw-semibold text-warning">{`${csv_data.length} tracks`}</p>
            </div>
          </Row>
        </Col>
      </Row>
      </div>
    </main>
  );
}
