// @ts-nocheck
import React, { useState } from "react";
import Tesseract from "tesseract.js";

export default function KtpOcr({
  onExtractBirthdate,
}: {
  onExtractBirthdate: (birthdate: string) => void;
}) {
  const [, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [underage, setUnderage] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUnderage(false);
      setVerified(false);
      setMessage("");
      setImage(file);
      runOCR(file);
    } else {
      setMessage("No image selected.");
    }
  };

  const runOCR = async (file: File) => {
    setLoading(true);
    setMessage("Processing image, please wait...");
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(file, "ind");
      console.log("OCR Text:", text);

      const dobMatch = text.match(/\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/);
      if (dobMatch) {
        const birthdateStr = dobMatch[0].replace(/[-/.]/g, "-");
        const [day, month, year] = birthdateStr.split("-");
        const birthdate = new Date(`${year}-${month}-${day}`);
        const age = calculateAge(birthdate);

        onExtractBirthdate(birthdateStr);
        setMessage(`Birthdate found: ${birthdateStr}`);
        if (age < 18) {
          setUnderage(true);
          setVerified(false);
        } else {
          setUnderage(false);
          setVerified(true);
        }
      } else {
        setMessage("Birthdate not found.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      setMessage("Failed to process the image.");
    }
    setLoading(false);
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="w-full max-w-md p-4 border border-orange-300 rounded-xl shadow-sm bg-white space-y-3">
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Upload Your ID Image
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
      />
      {loading && (
        <p className="text-sm text-orange-600 animate-pulse">
          Detecting text...
        </p>
      )}
      {!loading && message && (
        <p className="text-sm text-gray-700">{message}</p>
      )}
      {underage && (
        <p className="text-sm text-red-600 font-semibold">
          ❌ You are not 18 yet.
        </p>
      )}
      {verified && (
        <p className="text-sm text-green-600 font-semibold">
          ✅ You are 18 or older. Proof verified.
        </p>
      )}
    </div>
  );
}
