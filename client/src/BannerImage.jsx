import {UserContext} from "./UserContext";
import imageSrc from './assets/bannerimage.webp';

export default function BannerImage() {
  return (
    <img
      src={imageSrc}
      alt="Home Banner"
      className="full-width-image"
    />
  );
}