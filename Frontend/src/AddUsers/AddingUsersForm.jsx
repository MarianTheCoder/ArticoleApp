import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext, useEffect, useState } from 'react'
import { AngajatiContext } from '../context/UsersContex';
import defaultPhoto from '../assets/no-user-image-square.jpg';
import api from '../api/axiosAPI';

export default function AddingUsersForm() {

  const {clicked, getAngajati} = useContext(AngajatiContext);

  const [formData, setFormData] = useState({
      email:"",
      name:"",
      password:"",
      role: clicked
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(defaultPhoto);

  useEffect(() => {
    handleClicked(clicked)
  }, [clicked])

  const handleSubmit = async (e) => {
    e.preventDefault();
    const roles = ["ofertant", "angajat", "beneficiar"];
    // Send form data and compressed photo to the backend
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('role', roles[formData.role-1]);
    data.append('photo', selectedFile);

    try {
      await api.post("/users/SetUser", data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Photo uploaded successfully!');
      getAngajati();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };
  
  const handleClicked = (click) => {
    setFormData((prev) => ({ ...prev, role: click }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = (e) => {
      e.preventDefault();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Show image preview
    }
  };

  const handleButtonClick = () => {
    document.getElementById('hiddenFileInput').click();
  };

  return (
    <div className='w-full containerWhiter'>
      <div className="flex  justify-center items-center text-black  ">
        <form onSubmit={handleSubmit} className="w-full p-6 px-12 rounded-xl shadow-xl">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] xxxl:gap-12 md:gap-6 xl:gap-8 items-center">
        {/* photourl */}
          <div className="flex flex-col items-center w-full">
              <div className=' items-center gap-4 flex w-full'>
              <div className="w-12 sm:w-24 md:w-32 lg:w-40 aspect-square">
                <img className='rounded-xl object-cover w-full h-full ' src={preview == null ? defaultPhoto : preview}></img>
              </div>
                <button type="button" onClick={handleButtonClick} className="bg-white w-full rounded-xl mt-6 p-2 ">Choose File</button>
                <input id="hiddenFileInput" type="file" onChange={handleFileChange} className="hidden"/>
        
              </div>
          </div>
          <div className="flex flex-col items-center">
              <label htmlFor="code" className=" font-medium text-black">
                  Email
              </label>
              <input
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
                  placeholder="Enter email"
              />
          </div>
            {/* Description Input */}
            <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Name
              </label>
              <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
                  placeholder="Enter name"
              />
          </div>
          <div className="flex flex-col items-center">
              <label
                  htmlFor="description"
                  className=" font-medium text-black"
              >
                  Password
              </label>
              <input
                  
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className=" px-2 py-2  text-center w-full outline-none rounded-lg shadow-sm "
                  placeholder="Enter Password"
              />
          </div>
            <div className="flex gap-2 items-center ">
              <button type="submit" className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-6 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Submit</button>
              {/* {<button className="bg-red-500 hover:bg-red-600 text-white text-lg mt-6 px-2 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/>Cancel</button>} */}
            </div>
          </div>
        </form>
      </div>
      </div>
  );
}
