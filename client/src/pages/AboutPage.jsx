import { Link } from "react-router-dom";
import myimgb from '../assets/picB.png';

export default function AboutPage() {
  return (
    <div className="about-page">
      <img src={myimgb} alt="Your Name" className="about-page-image" />
      <h1>About Mercy</h1>
      <h2>Hey there, I'm Mercy Njuguna!</h2>
      <h4> BORN AND BRED IN KENYA</h4>
      <p>When I'm not writing code or spending time with my family, I will be here as often as possble.</p>
      <p>In Light of Eternity is where I share my life and the experiences that have shaped me this far. My desire is to spur and encourage anyone going through a difficult season in their life. I welcome you to take this journey with me as look into God's word and find strength to live our day to day life in light of the eternity promised to us.</p>
      <p>The following verses have held a special place in my heart this past few years, John 11:25 Jesus said to her, “I am the resurrection and the life. The one who believes in me will live, even though they die; 26 and whoever lives by believing in me will never die. Do you believe this?”. As I have grappled with extremely difficult circumstances of losing half of my nuclear family of 6 within a span of less than 4 years, I have found myself reflecting on the substance and purpose of life. I look forward to sharing more about my journey in this space.</p>
      <p> Welcome and may you find rest in Christ in whatever season you are.</p>
      <Link to="/" className="back-to-home">Back to Home</Link>
    </div>
  );
}

