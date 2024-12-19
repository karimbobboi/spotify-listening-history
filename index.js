import { default as axios } from 'axios';
import express from 'express'
import queryString from 'query-string';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3000;
const track_limit = 50

const saved_responses_dir = 'saved_responses';
const listening_history = 'listening_history.csv';

// spotify API credentials
const clientId = '67b5ea699c8d42daa3602d679bc51317';
const clientSecret = '05d5bc0d7d824e279b1631e1f34307e0';
const redirectUri = "http://localhost:3000/callback";
const scopes = "user-read-recently-played";

const todays_date_iso = () => {
  const currentDate = new Date();
  const isoDate = currentDate.toISOString();
  return isoDate;
}

const extract_artists = (artists_array) => {
  const extracted = [];
  artists_array.forEach(element => {
    const artist = element.name == 'st3.ve0' ? 'Kendrick Lamar' : element.name;
    extracted.push(artist);
  });

  return extracted.join('|');
};

const add_new_entry = (item) => {
  const date_time = item.played_at;
  const song = item.track.name;
  const artist = extract_artists(item.track.artists);
  const album = item.track.album.name;
  const link = item.track.external_urls.spotify;
  const date_added = todays_date_iso();
  const entry = `\r\n"${date_time}","${song}","${artist}","${album}","${link}","${date_added}"`;
  return entry;
};

const add_to_history = (items) => {
  let lastPlayedAt = null;

  if (fs.existsSync(listening_history)) {
    const existingData = fs.readFileSync(listening_history, 'utf8');
    const lines = existingData.trim().split('\n');
    if (lines.length > 1) {
      const lastRow = lines[lines.length - 1];
      lastPlayedAt = lastRow.split(',')[0].replace(/"/g, '').trim(); // extract last played_at
    }
  }

  let temp = '';
  for (const element of items) {
    if (element.played_at <= lastPlayedAt) {
      continue;
    }
    temp += add_new_entry(element);
  }

  if(temp){
    fs.appendFileSync(listening_history, temp, 'utf8');
    console.log('new entries added to history');
  } else {
    console.log('no new entries added');
  }
};

// Redirect to Spotify for authentication
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get("/login", (req, res) => {
  const authUrl = "https://accounts.spotify.com/authorize?" + 
  queryString.stringify({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes
    });
  res.redirect(authUrl);
});

// Handle callback and exchange code for access token
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      queryString.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = response.data;
    res.redirect(`/recently-played?access_token=${access_token}`);
  } catch (error) {
    console.error(error.response.data);
    res.status(500).send("Error retrieving access token");
  }
});

// Fetch recently played tracks
app.get("/recently-played", async (req, res) => {
  const accessToken = req.query.access_token;

  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/player/recently-played?limit=${track_limit}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = response.data;
    const folderPath = path.join(__dirname, saved_responses_dir);
    const filePath = path.join(folderPath, `recently_played_${Date.now()}.json`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8', (err) => {
      if (err) {
        console.error("Error saving file:", err);
        return res.status(500).send("Error saving response to file");
      }
      console.log(`Response saved to ${filePath}`);
    });

    const tracks = data.items.sort((a, b) => a.played_at.localeCompare(b.played_at));
    add_to_history(tracks);

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching recently played tracks");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});