import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { v4 as uuidv4 } from "uuid";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const storageBucket = import.meta.env.VITE_STORAGE_BUCKET || "images";

const GalleryPage = () => {
  const user = useUser();
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [categories, setCategories] = useState(["Unsorted"]);
  const [categoryByImage, setCategoryByImage] = useState({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [uploadCategory, setUploadCategory] = useState("Unsorted");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [archivedImages, setArchivedImages] = useState({});

  const categoryStorageKey = user ? `gallery-categories-${user.id}` : null;
  const imageCategoryStorageKey = user ? `gallery-image-categories-${user.id}` : null;
  const archivedImagesStorageKey = user ? `gallery-recently-deleted-${user.id}` : null;

  const getImageUrl = (name) => imageUrls[name] || "";

  const getImages = useCallback(async () => {
    const { data, error } = await supabase.storage.from(storageBucket).list(`${user?.id}/`, { limit: 100, offset: 0, sortBy: { column: "created_at", order: "desc" } });
    if (data !== null) {
      setImages(data);
      const signedUrls = await Promise.all(data.map(async (image) => {
        const { data: signedData } = await supabase.storage.from(storageBucket).createSignedUrl(`${user.id}/${image.name}`, 3600);
        return [image.name, signedData?.signedUrl || ""];
      }));
      setImageUrls(Object.fromEntries(signedUrls));
    }
    if (error) {
      alert(error.message);
      console.log(error);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (user) getImages();
  }, [getImages, user]);

  useEffect(() => {
    if (!categoryStorageKey) return;
    const savedCategories = JSON.parse(localStorage.getItem(categoryStorageKey) || "[\"Unsorted\"]");
    const savedImageCategories = JSON.parse(localStorage.getItem(imageCategoryStorageKey) || "{}");
    const savedArchivedImages = JSON.parse(localStorage.getItem(archivedImagesStorageKey) || "{}");
    setCategories(savedCategories);
    setCategoryByImage(savedImageCategories);
    setArchivedImages(savedArchivedImages);
    setUploadCategory(savedCategories[0] || "Unsorted");
  }, [categoryStorageKey, imageCategoryStorageKey, archivedImagesStorageKey]);

  useEffect(() => {
    if (categoryStorageKey) localStorage.setItem(categoryStorageKey, JSON.stringify(categories));
  }, [categories, categoryStorageKey]);

  useEffect(() => {
    if (imageCategoryStorageKey) localStorage.setItem(imageCategoryStorageKey, JSON.stringify(categoryByImage));
  }, [categoryByImage, imageCategoryStorageKey]);

  useEffect(() => {
    if (archivedImagesStorageKey) localStorage.setItem(archivedImagesStorageKey, JSON.stringify(archivedImages));
  }, [archivedImages, archivedImagesStorageKey]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setSelectedImage(null);
      setShowNewCategory(false);
      setCategoryToDelete(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const signout = async () => {
    const { error } = await supabase.auth.signOut();
    navigate("/");
    if (error) {
      alert(error.message);
      console.log(error);
    }
  };

  const createCategory = (event) => {
    event.preventDefault();
    const category = newCategory.trim();
    if (!category || categories.includes(category)) return;
    setCategories((current) => [...current, category]);
    setUploadCategory(category);
    setActiveCategory(category);
    setNewCategory("");
    setShowNewCategory(false);
  };

  const uploadImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !user || uploading) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(`Uploading 0 of ${files.length} images...`);
    let uploadedCount = 0;
    let failedCount = 0;
    const nextCategories = {};
    for (const file of files) {
      const imageName = uuidv4();
      const { error } = await supabase.storage.from(storageBucket).upload(`${user.id}/${imageName}`, file, { contentType: file.type });
      if (error) {
        failedCount += 1;
        console.error(error);
      } else {
        uploadedCount += 1;
        nextCategories[imageName] = uploadCategory;
      }
      const completedCount = uploadedCount + failedCount;
      setUploadProgress(Math.round((completedCount / files.length) * 100));
      setUploadStatus(`Uploading ${completedCount} of ${files.length} images...`);
    }
    if (uploadedCount) setCategoryByImage((current) => ({ ...current, ...nextCategories }));
    await getImages();
    setUploadStatus(`${uploadedCount} image${uploadedCount === 1 ? "" : "s"} uploaded${failedCount ? `, ${failedCount} failed` : ""}.`);
    setUploading(false);
    event.target.value = "";
  };

  const setImageCategory = (imageName, category) => {
    setCategoryByImage((current) => ({ ...current, [imageName]: category }));
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    setCategoryByImage((current) => {
      const next = { ...current };
      images.forEach((image) => {
        if ((next[image.name] || "Unsorted") === categoryToDelete) next[image.name] = "Unsorted";
      });
      return next;
    });
    setCategories((current) => current.filter((category) => category !== categoryToDelete));
    setActiveCategory("All");
    setCategoryToDelete(null);
  };

  const confirmDelete = async () => {
    if (!imageToDelete || deletingImage) return;
    const name = imageToDelete.name;
    if (!imageToDelete.archived) {
      setArchivedImages((current) => ({ ...current, [name]: Date.now() }));
      setImageToDelete(null);
      return;
    }
    setDeletingImage(true);
    const { data, error } = await supabase.storage.from(storageBucket).remove([`${user.id}/${name}`]);
    if (data) {
      await getImages();
      setArchivedImages((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      setImageToDelete(null);
    }
    if (error) {
      alert(error.message);
      console.log(error);
    }
    setDeletingImage(false);
  };

  const restoreImage = (name) => {
    setArchivedImages((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const displayName = user?.user_metadata?.name || "Guest";
  const activeImages = activeCategory === "Recently deleted" ? images.filter((image) => archivedImages[image.name]) : images.filter((image) => !archivedImages[image.name]);
  const visibleImages = activeCategory === "All" || activeCategory === "Recently deleted" ? activeImages : activeImages.filter((image) => (categoryByImage[image.name] || "Unsorted") === activeCategory);

  return (
    <main className="gallery-shell">
      <nav className="gallery-nav">
        <div className="brand-mark gallery-brand">MG<span>.</span></div>
        <div className="gallery-links"><span>Archive</span><span>Collections</span><span>About</span></div>
        <div className="user-menu"><span className="status-dot" /> {displayName}<button onClick={signout} aria-label="Sign out">Sign out <span>↗</span></button></div>
      </nav>
      <section className="gallery-toolbar">
        <div className="folder-tools">
          <div className="filter-row"><button className={`filter ${activeCategory === "All" ? "active" : ""}`} onClick={() => setActiveCategory("All")}>All work <span>{images.filter((image) => !archivedImages[image.name]).length.toString().padStart(2, "0")}</span></button>{categories.map((category) => <button key={category} className={`filter ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category} <span>{images.filter((image) => !archivedImages[image.name] && (categoryByImage[image.name] || "Unsorted") === category).length.toString().padStart(2, "0")}</span></button>)}<button className={`filter archive-filter ${activeCategory === "Recently deleted" ? "active" : ""}`} onClick={() => setActiveCategory("Recently deleted")}>Recently deleted <span>{images.filter((image) => archivedImages[image.name]).length.toString().padStart(2, "0")}</span></button><button className="new-folder-button" onClick={() => setShowNewCategory((current) => !current)}>+ New folder</button>{activeCategory !== "All" && activeCategory !== "Unsorted" && activeCategory !== "Recently deleted" && <button className="delete-folder-button" onClick={() => setCategoryToDelete(activeCategory)}>Delete folder</button>}</div>
        </div>
        <div className="upload-controls"><label className="upload-category"><span>Upload to</span><select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} aria-label="Upload folder">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className={`upload-button ${uploading ? "is-uploading" : ""}`} style={{ "--upload-progress": `${uploadProgress}%` }}><input type="file" accept="image/png, image/jpeg, image/jpg" multiple onChange={uploadImages} disabled={uploading} />{uploading ? <span className="upload-progress-label">{uploadProgress}% <small>{uploadStatus}</small></span> : "Add images"}<span>+</span></label></div>
      </section>
      {visibleImages.length > 0 ? (
        <section className="image-grid" aria-label="Your image archive">
          {visibleImages.map((image) => (
            <figure key={image.name} className={`image-card ${archivedImages[image.name] ? "is-archived" : ""}`} onClick={() => setSelectedImage(image)} onKeyDown={(event) => event.key === "Enter" && setSelectedImage(image)} role="button" tabIndex="0">
              <img src={getImageUrl(image.name)} alt="" draggable="false" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} />
              {archivedImages[image.name] && <button onClick={(event) => { event.stopPropagation(); restoreImage(image.name); }} aria-label={`Restore ${image.name}`} className="restore-button">Restore</button>}
              <button onClick={(event) => { event.stopPropagation(); setImageToDelete({ ...image, archived: Boolean(archivedImages[image.name]) }); }} aria-label={archivedImages[image.name] ? `Permanently delete ${image.name}` : `Archive ${image.name}`} className="delete-button"><span>×</span><b>{archivedImages[image.name] ? "Delete forever" : "Archive"}</b></button>
              <figcaption><span>Frame {String(images.indexOf(image) + 1).padStart(2, "0")}</span><select value={categoryByImage[image.name] || "Unsorted"} onClick={(event) => event.stopPropagation()} onChange={(event) => { event.stopPropagation(); setImageCategory(image.name, event.target.value); }} aria-label="Image folder">{categories.map((category) => <option key={category}>{category}</option>)}</select></figcaption>
            </figure>
          ))}
        </section>
      ) : (
        <section className="empty-state"><span>○</span><h2>Your archive is waiting.</h2><p>Upload your first image to give this space a beginning.</p></section>
      )}
      <footer className="gallery-footer"><span>MG. PERSONAL ARCHIVE</span><span>{new Date().getFullYear()}</span></footer>
      {showNewCategory && (
        <div className="folder-modal-backdrop" role="presentation" onClick={() => setShowNewCategory(false)}>
          <section className="folder-modal" role="dialog" aria-modal="true" aria-labelledby="new-folder-title" onClick={(event) => event.stopPropagation()}>
            <button className="folder-modal-close" onClick={() => setShowNewCategory(false)} aria-label="Close new folder dialog">×</button>
            <div className="dialog-kicker">Organize your archive</div>
            <h2 id="new-folder-title">Name your new folder.</h2>
            <p>Give a group of images a place of its own.</p>
            <form className="folder-modal-form" onSubmit={createCategory}>
              <label htmlFor="new-folder-name">Folder name</label>
              <input id="new-folder-name" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Summer studies" autoFocus required />
              <button type="submit">Create folder <span>↗</span></button>
            </form>
          </section>
        </div>
      )}
      {imageToDelete && (
        <div className="delete-dialog-backdrop" role="presentation" onClick={() => !deletingImage && setImageToDelete(null)}>
          <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-kicker">{imageToDelete.archived ? "Permanent deletion" : "Move to archive"}</div>
            <h2 id="delete-title">{imageToDelete.archived ? "Delete forever?" : "Move this one out?"}</h2>
            <p>{imageToDelete.archived ? "This image will be permanently removed from Supabase storage. This cannot be undone." : "The image will move to Recently deleted, where you can restore it or delete it forever."}</p>
            <div className="dialog-actions"><button className="cancel-delete" onClick={() => setImageToDelete(null)} disabled={deletingImage}>Keep image</button><button className="confirm-delete" onClick={confirmDelete} disabled={deletingImage}>{deletingImage ? "Deleting..." : imageToDelete.archived ? "Delete forever" : "Move to archive"}<span>×</span></button></div>
          </section>
        </div>
      )}
      {categoryToDelete && (
        <div className="delete-dialog-backdrop" role="presentation" onClick={() => setCategoryToDelete(null)}>
          <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-delete-title" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-kicker">Delete folder</div>
            <h2 id="folder-delete-title">Remove “{categoryToDelete}”?</h2>
            <p>The folder will disappear, but its images will be kept safely in Unsorted.</p>
            <div className="dialog-actions"><button className="cancel-delete" onClick={() => setCategoryToDelete(null)}>Keep folder</button><button className="confirm-delete" onClick={confirmDeleteCategory}>Delete folder <span>×</span></button></div>
          </section>
        </div>
      )}
      {selectedImage && (
        <div className="lightbox-backdrop" role="presentation" onClick={() => setSelectedImage(null)}>
          <section className="lightbox" role="dialog" aria-modal="true" aria-label="Enlarged image" onClick={(event) => event.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Close enlarged image">Close <span>×</span></button>
            <img src={getImageUrl(selectedImage.name)} alt="Enlarged archive frame" draggable="false" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} />
            <p>Frame {String(images.indexOf(selectedImage) + 1).padStart(2, "0")} <span>/</span> Personal archive</p>
          </section>
        </div>
      )}
    </main>
  );
};

export default GalleryPage;
