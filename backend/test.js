const axios = require('axios');

async function testRedditImages() {
  const url = 'https://www.reddit.com/r/VinylReleases/new.json?limit=20';
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'VinylDrop/1.0.0' }
  });

  const posts = response.data.data.children;
  
  console.log('Testing first 20 posts:\n');
  
  posts.forEach((post, i) => {
    const data = post.data;
    console.log(`${i + 1}. ${data.title.substring(0, 50)}...`);
    console.log(`   Thumbnail: ${data.thumbnail}`);
    console.log(`   URL: ${data.url}`);
    console.log(`   Has preview: ${!!data.preview}`);
    if (data.preview && data.preview.images) {
      console.log(`   Preview URL: ${data.preview.images[0].source.url}`);
    }
    console.log('');
  });
}

testRedditImages();