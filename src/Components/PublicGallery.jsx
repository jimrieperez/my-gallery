import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const storageBucket = import.meta.env.VITE_STORAGE_BUCKET || "images";

const PublicGallery = () => {
  const supabase = useSupabaseClient();
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [galleryError, setGalleryError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const loadGallery = async () => {
      const { data: folders, error: folderError } = await supabase.storage.from(storageBucket).list("", { limit: 1000 });
      if (folderError || !folders) {
        setGalleryError("The shared gallery cannot read the image collection. Run the latest supabase-storage-policies.sql file in Supabase, then refresh.");
        setLoading(false);
        return;
      }
      const userFolders = folders.filter((folder) => folder.name && folder.name !== ".emptyFolderPlaceholder");
      const folderImages = await Promise.all(userFolders.map(async (folder) => {
        const { data, error } = await supabase.storage.from(storageBucket).list(folder.name, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
        if (error) console.error(error);
        return (data || []).filter((image) => image.name).map((image) => ({ ...image, path: `${folder.name}/${image.name}` }));
      }));
      const allImages = folderImages.flat().sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0));
      setImages(allImages);
      const signedUrls = await Promise.all(allImages.map(async (image) => {
        const { data } = await supabase.storage.from(storageBucket).createSignedUrl(image.path, 3600);
        return [image.path, data?.signedUrl || ""];
      }));
      const urls = Object.fromEntries(signedUrls);
      if (allImages.length > 0 && Object.values(urls).every((url) => !url)) setGalleryError("Images were found, but viewing is blocked by the Supabase storage policy. Run the latest SQL policy file, then refresh.");
      setImageUrls(urls);
      setLoading(false);
    };

    loadGallery();
  }, [supabase]);

  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && setSelectedImage(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const loadingTiles = Array.from({ length: 9 });

  return (
    <main className="public-gallery-shell">
      <nav className="public-gallery-nav"><div className="brand-mark gallery-brand">MG<span>.</span></div><div className="public-nav-label">Shared archive / {images.length.toString().padStart(2, "0")} frames</div><Link to="/signin">Sign in <span>↗</span></Link></nav>
      {loading ? <section className="public-loading" aria-label="Loading shared gallery"><article className="public-skeleton-intro"><div className="skeleton-mark" /><div className="skeleton-lines"><span /><span /><span /></div></article>{loadingTiles.map((_, index) => <div key={index} className="public-skeleton-tile" />)}<p className="loading-caption">Curating the collection <span>·</span> Please wait</p></section> : galleryError ? <section className="empty-state public-empty"><span>!</span><h2>Collection unavailable.</h2><p>{galleryError}</p></section> : images.length > 0 ? <section className="public-reference-grid" aria-label="Shared gallery"><article className="public-intro-card"><div className="intro-art"><span>MG.</span></div><div className="public-feature-copy"><p>PERSONAL ARCHIVE</p><h1>Shared<br /><em>moments.</em></h1><span>{images.length.toString().padStart(2, "0")} EVENT PHOTOS</span></div></article>{images.map((image, index) => <figure key={image.path} className="public-reference-card" onClick={() => setSelectedImage(image)} onKeyDown={(event) => event.key === "Enter" && setSelectedImage(image)} role="button" tabIndex="0"><img src={imageUrls[image.path] || ""} alt="" draggable="false" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} /><figcaption><span>Archive frame</span><span>{String(index + 1).padStart(2, "0")}</span></figcaption></figure>)}</section> : <section className="empty-state public-empty"><span>○</span><h2>The collection is quiet.</h2><p>Images will appear here after users add them to their archives.</p></section>}
      <footer className="gallery-footer"><span>MG. SHARED COLLECTION</span><Link to="/signin">Enter private archive ↗</Link></footer>
      {selectedImage && <div className="lightbox-backdrop" role="presentation" onClick={() => setSelectedImage(null)}><section className="lightbox" role="dialog" aria-modal="true" aria-label="Enlarged shared image" onClick={(event) => event.stopPropagation()}><button className="lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Close enlarged image">Close <span>×</span></button><img src={imageUrls[selectedImage.path] || ""} alt="Enlarged shared archive frame" draggable="false" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} /><p>Archive frame <span>/</span> Shared collection</p></section></div>}
    </main>
  );
};

export default PublicGallery;
