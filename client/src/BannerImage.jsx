import {UserContext} from "./UserContext";
import imageSrc from './assets/bannerimage.png';

export default function BannerImage() {
  return (
    <img
      src={imageSrc}
      alt="Home Banner"
      className="full-width-image"
    />
  );
}
