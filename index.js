const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ✅ FB Video Scraper
async function scrapeFB(url) {
  try {
    // Method 1 - fdown.net scrape
    const encoded = encodeURIComponent(url);
    const res = await axios.post('https://fdown.net/download.php', 
      `URLz=${encoded}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://fdown.net/',
          'Origin': 'https://fdown.net'
        }
      }
    );

    const html = res.data;
    
    // Extract HD link
    const hdMatch = html.match(/href="(https:\/\/[^"]*?\.mp4[^"]*?)"\s*id="hdlink"/);
    // Extract SD link  
    const sdMatch = html.match(/href="(https:\/\/[^"]*?\.mp4[^"]*?)"\s*id="sdlink"/);
    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/);

    const hdLink = hdMatch ? hdMatch[1] : null;
    const sdLink = sdMatch ? sdMatch[1] : null;
    const title = titleMatch ? titleMatch[1].replace(' - Download Facebook Videos', '').trim() : 'Facebook Video';

    if (!hdLink && !sdLink) throw new Error('No video found');

    return {
      success: true,
      result: {
        title,
        dlLink: {
          hdLink: hdLink || sdLink,
          sdLink: sdLink || hdLink
        }
      }
    };

  } catch (err) {
    // Method 2 - savefrom fallback
    try {
      const res2 = await axios.get(`https://worker.svcg.workers.dev/?url=${encodeURIComponent(url)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = res2.data;
      if (data && data.url && data.url[0]) {
        return {
          success: true,
          result: {
            title: data.meta?.title || 'Facebook Video',
            thumbnail: data.meta?.og?.image || null,
            dlLink: {
              hdLink: data.url[0].url,
              sdLink: data.url[1]?.url || data.url[0].url
            }
          }
        };
      }
      throw new Error('Method 2 failed');
    } catch (e) {
      throw new Error('All methods failed: ' + e.message);
    }
  }
}

// ✅ Main Route
app.get('/api/fbdl', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.json({ success: false, error: 'URL is required. Use ?url=FB_VIDEO_URL' });
  }

  if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
    return res.json({ success: false, error: 'Invalid Facebook URL' });
  }

  try {
    const result = await scrapeFB(url);
    return res.json(result);
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

// ✅ Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ FB Downloader API Running!',
    endpoints: {
      download: '/api/fbdl?url=FB_VIDEO_URL'
    },
    author: 'DEW-MD'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

module.exports = app;
