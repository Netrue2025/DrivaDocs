import { PreloaderArtwork } from "@/components/preloader-artwork";

export default function Loading() {
  return (
    <div className="navigation-preloader" role="status" aria-live="polite" aria-label="Loading DrivaDocs">
      <PreloaderArtwork />
    </div>
  );
}
