import imageSrc from './assets/bannerimage.webp';

export default function BannerImage() {
  // Intrinsic size reserves the banner's space before it loads, so scroll targets below it don't shift.
  return (
    <img
      src={imageSrc}
      alt="Home Banner"
      className="full-width-image"
      width={2048}
      height={1536}
    />
  );
}
