import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export const clientId = process.env.NEXT_PUBLIC_clientId;
export const clientSecret = process.env.NEXT_PUBLIC_clientSecret;

const useSpotifyAuth = () => {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("spotify_access_token");
    if (storedToken) {
      setAccessToken(storedToken);
    } else {
      router.push("/login");
    }
  }, [router]);

  const getRefreshToken = async () => {
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    if (!refreshToken) {
      console.log("No refresh token found. Redirecting to login...");
      router.push("/login");
      return;
    }

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          },
        }
      );

      const { access_token, refresh_token } = response.data;
      console.log("New access token:", access_token);

      localStorage.setItem("spotify_access_token", access_token);
      if (refresh_token) {
        localStorage.setItem("spotify_refresh_token", refresh_token);
      }
      setAccessToken(access_token);
    } catch (error) {
      console.error("Error refreshing token:", error);
      router.push("/login");
    }
  };

  return { access_token: accessToken, getRefreshToken };
};

export default useSpotifyAuth;
