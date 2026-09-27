require('dotenv').config();

async function test() {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    console.log("Keys loaded:");
    console.log("AppKey:", process.env.TWITTER_API_KEY ? "Loaded" : "Missing");
    
    console.log("Attempting to tweet via v2...");
    await client.v2.tweet("Test tweet from Node.js " + Date.now());
    console.log("Success v2!");
  } catch (e) {
    console.error("Failed v2:", e);
  }
}
test();
