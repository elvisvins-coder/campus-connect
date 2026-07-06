// src/components/CreatePost.tsx
import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function CreatePost({ user }: any) {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");

  const handlePost = async () => {
    if (!text) return;
    try {
      await addDoc(collection(db, "posts"), {
        name: user?.email,
        text,
        image: image || "",
        createdAt: serverTimestamp(),
      });
      setText("");
      setImage("");
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) return null;

  return (
    <div style={{ margin: "20px 0" }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        style={{ width: "100%", marginBottom: "5px" }}
      />
      <input
        type="text"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        placeholder="Image URL (optional)"
        style={{ width: "100%", marginBottom: "5px" }}
      />
      <button onClick={handlePost} style={{ width: "100%" }}>
        Post
      </button>
    </div>
  );
}

export default CreatePost;