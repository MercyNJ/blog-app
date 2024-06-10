import { Link } from "react-router-dom";
import myimgb from '../assets/picB.png';

export default function AboutPage() {
  return (
    <div className="about-page">
      <img src={myimgb} alt="Your Name" className="about-page-image" />
      <h3>ABOUT MERCY</h3>
      <h4>Hey there, I'm Mercy Njuguna!</h4><br />
      <h5>BORN AND BRED IN KENYA</h5>
      <p>When I'm not writing code or spending time with my family, you'll find me here as often as possible.</p>
      <p>"In Light of Eternity" is where I share my life and the experiences that have shaped me thus far. My desire is to spur and encourage anyone going through a difficult season in their life. I invite you to join me on this journey as we explore God's word and find strength to live our day-to-day lives in light of the eternity promised to us.</p>
      <p>The following verses have held a special place in my heart in recent years: John 11:25-26. Jesus said to her, “I am the resurrection and the life. The one who believes in me will live, even though they die; and whoever lives by believing in me will never die. Do you believe this?”</p>
      <p>As I've grappled with extremely difficult circumstances, including the loss of half of my nuclear family of six within a span of less than four years, I've found myself reflecting on the substance and purpose of life. I look forward to sharing more about my journey in this space.</p>
      <p>Welcome, and may you find rest in Christ no matter what season you're in.</p>
      <Link to="/" className="back-to-home">Back to Home</Link>
    </div>
  );
}
