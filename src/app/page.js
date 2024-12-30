"use client"

import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "./page.module.css";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Row, Col, Table, Button, Spinner, Image } from "react-bootstrap";

export default function Home() {
  const router = useRouter();
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csv_data, setData] = useState([]);
  const [last_updated, setLast_updated] = useState("");
  const [filters, setFilters] = useState(["Artists", "Songs", "Albums"]);
  const [access_token, setAccessToken] = useState(null);
  const [topSong, setTopSong] = useState(null);

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

  const fetchRecentlyPlayed = async () => {
    if(!access_token) return;
    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/player/recently-played?limit=50",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      
      if(response){
        if(response.status == 401){
          console.log('api key expired.');
          router.push('/login');
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
    if(csv_data.length < 1) return;

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

    console.log(track_counts)
  
    return { song: most_played, count: max_count };
  };

  const fetch_song_details = async (song) => {
    if(!access_token) return;
    const song_code = song.includes("https://open.spotify.com/track/") ? song.substring(31) : '';
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${song_code}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      
      if(response){
        const data = await response.json();
        console.log(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching recently played tracks:", error);
    }
  
    return;
  }

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
      router.push('/login');
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
        setData(result);
        console.log("Updated CSV:", result);
      } catch (error) {
        console.error("Error updating CSV:", error);
      }
    };

    postList();
  }, [recentTracks]);

  useEffect(() => {
    const fetchTopSong = async () => {
      if (csv_data.length > 0 && csv_data[0].link) {
        const most_played = get_most_played();
        console.log(most_played);
        const song = await fetch_song_details(most_played.song);
        setTopSong(song);
      }
    };
    
    fetchTopSong();
  }, [csv_data]);

  useEffect(() => {
    console.log("topSong")
    console.log(topSong)
  }, [topSong]);

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
    <main style={{
      height: '100vh',
      background: "rgb(0,29,61)",
      background: "linear-gradient(180deg, rgba(0,29,61,1) 73%, rgba(100,2,76,1) 90%)"
    }}>
      <div className='px-3'>
        <button className={`rounded px-2 ${styles.refreshBtn}`}  onClick={handleRefreshClicked}>
          <i className="bi bi-arrow-repeat text-light fs-4"></i>
        </button>
      </div>
      <Row className='p-3'>
        <Col className='' sm={8}>
        {loading ? (
          <div className='bg-dark text-center position-relative h-100 mx-auto' style={{maxHeight: '90vh'}}>
            <Spinner className='position-absolute top-50' animation="border" variant="warning"/>
          </div>
        ) : (
          <div className="table-container border border-dark border-3 rounded"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
              scrollbarWidth: "none",
            }} >
            <Table className="bg-danger table-borderless"
              hover variant='dark'
              style={{
                backgroundColor: "transparent",
              }} >
              <thead className="table-header"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  color: "#fff",
                }} >
                <tr className="border-bottom border-bottom-3 border-secondary">
                  <th>Played at</th>
                  <th>Track</th>
                  <th>Artist</th>
                  <th>Album</th>
                </tr>
              </thead>
              <tbody className="table-group-divider">
                {csv_data &&
                  csv_data.toReversed().map((item, index) => {
                    return (
                      <tr className="border-0"
                        key={index}
                        onClick={() => window.open(item.link, "_blank")}
                        style={{
                          backgroundColor: "transparent",
                        }} >
                        <td>{formatDate(item[`${Object.keys(item)[0]}`])}</td>
                        <td>{item.song}</td>
                        <td>{item.artist.replaceAll("|", ", ")}</td>
                        <td>{item.album}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>
          
        )}
        </Col>
        <Col>
          {(!topSong) ? (
              <></>
            ) : (
              <>
                <Row className='border-none'>
                  {topSong != null && topSong.album.images[0].url ? (
                    <Image className='p-0 border border-0 rounded'
                      src={topSong.album.images[0].url}
                      alt="Album Art" />
                  ) : (
                    <p>No album art available</p>
                  )}
                </Row>
              </>
            )}
        </Col>
      </Row>
    </main>
  );
}
