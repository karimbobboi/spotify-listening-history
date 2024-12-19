"use client"

// import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Row, Col } from "react-bootstrap";

const fetchRecentlyPlayed = async (accessToken) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching recently played tracks:", error);
    return null;
  }
};

export default function Home() {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csv_data, setData] = useState([]);

  useEffect(() => {
    const getRecentlyPlayed = async () => {
      const accessToken = localStorage.getItem("spotify_access_token"); // Retrieve the token

      if (!accessToken) {
        console.error("no access token found");
        return;
      }

      const data = await fetchRecentlyPlayed(accessToken);
      if (data && data.items) {
        setRecentTracks(data.items);
      }
      setLoading(false);
    };

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

  if (loading) return <h1>Loading...</h1>;

  return (
    <main>
      <Row>
        <Col sm={8}></Col>
        <Col></Col>
      </Row>
    </main>
  );
}
