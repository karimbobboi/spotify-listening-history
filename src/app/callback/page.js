"use client"

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import axios from 'axios';
import Spinner from 'react-bootstrap/Spinner';
import 'bootstrap/dist/css/bootstrap.min.css';

export const clientId = process.env.NEXT_PUBLIC_clientId;
export const clientSecret = process.env.NEXT_PUBLIC_clientSecret;
export const redirectUri = "http://localhost:3000/callback";
export const scopes = "user-read-recently-played";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code' || null);

  useEffect(() => {
    const fetchAccessToken = async () => {
      if (!code) return;

      try {
        const response = await axios.post(
          'https://accounts.spotify.com/api/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        
        const { access_token } = response.data;
        if (access_token) {
          localStorage.setItem("spotify_access_token", access_token);
          router.push("/");
        }
      } catch (error) {
        console.error('Error exchanging code for token:', error);
      }
    };

    fetchAccessToken();
  }, [router.query, router]);

  return (
    <div className='bg-danger' style={{backgroundColor: 'red'}}>
      <div className='bg-primary text-center position-relative h-100 mx-auto' style={{minHeight: '100vh'}}>
        <Spinner className='position-absolute top-50' animation="border" variant="warning"/>
      </div>
    </div>
  );
}