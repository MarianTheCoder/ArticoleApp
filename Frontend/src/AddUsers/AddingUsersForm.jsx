import { faCancel, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext, useEffect, useState } from 'react'
import { AngajatiContext } from '../context/UsersContex';
import defaultPhoto from '../assets/no-user-image-square.jpg';
import api from '../api/axiosAPI';
import { AuthContext } from '../context/TokenContext';
import photoAPI from '../api/photoAPI';

export default function AddingUsersForm() {

  const {user, setUser, getUsersForSantiere} = useContext(AuthContext);

  const {clicked, getAngajati, setConfirmDel, confirmDel, deleteAngajat, setEditAngajat, editAngajat, preview, setPreview, setSelectedFile, selectedFile} = useContext(AngajatiContext);

  const [formData, setFormData] = useState({
      email:"",
      name:"",
      password:"",
      telephone:"",
      role: clicked
  });

  useEffect(() => {
    if(clicked != formData.role){
      setFormData({
        email:"",
        name:"",
        password:"",
        telephone:"",
        role: clicked
      }); 
      setSelectedFile(null);
      setPreview(defaultPhoto);
      setEditAngajat(null);
      setConfirmDel(null);
    }
    else{
      if(editAngajat != null){
        setFormData({
          email: editAngajat.email,
          name: editAngajat.name,
          password: "",
          telephone:editAngajat.telephone,
          role: clicked
        });
        setSelectedFile(null);
        setPreview(`${photoAPI}/${editAngajat.photo_url}`);
        setConfirmDel(null);
      }
      else{
        setFormData({
          email:"",
          name:"",
          password:"",
          telephone:"",
          role: clicked
        }); 
        setSelectedFile(null);
        setPreview(defaultPhoto);
        setEditAngajat(null);
      }
    }
    
  }, [clicked,editAngajat])

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(formData.email.trim() === "" || formData.name.trim() === "" || formData.password.trim() === ""){
      alert("All fields are required");
      return;
    }
    const roles = ["ofertant", "angajat", "beneficiar"];
    // Send form data and compressed photo to the backend
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('telephone', formData.telephone);
    data.append('role', roles[formData.role-1]);
    data.append('photo', selectedFile);

    try {
      if(editAngajat != null){
        let res = await api.post(`/users/UpdateUser/${editAngajat.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data'},
        })
        if(res.data.id == user.id){
          localStorage.setItem('photoUser', res.data.photo_url);
          setUser({
            id: user.id,
            role: user.role,
            name: res.data.name,
        });
        } 
        setEditAngajat(null);
      }else{
        await api.post("/users/SetUser", data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFormData({
          email:"",
          name:"",
          password:"",
          telephone:"",
          role: clicked
        }); 
        setSelectedFile(null);
        setPreview(defaultPhoto);
      }
      console.log('Photo uploaded successfully!');
      getAngajati();
      if(roles[formData.role-1] == "beneficiar"){
        getUsersForSantiere();
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };
  

  const handleChange = (e) => {
    if(e.target.name == "name"){
      if(/^[\p{L}][\p{L}\s-]*$/u.test(e.target.value) || e.target.value == ""){
        let { name, value } = e.target;
        if (value.length > 1 && (value[value.length - 2] === " " || value[value.length - 2] === "-")) {
          value = value.slice(0, -1) + value.charAt(value.length - 1).toUpperCase();
        }
        else if(value.length == 1){
          value = value.charAt(0).toUpperCase();
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    else if(e.target.name == "telephone"){ 
      if(/^\d*$/.test(e.target.value) || e.target.value == ""){
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } 
    else{
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const cancelEdit = (e) => {
    e.preventDefault();
    setEditAngajat(null);
  };

  const cancelDel = (e) => {
    e.preventDefault();
    setConfirmDel(null);
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Show image preview
      e.target.value = null;
    }
  };

  const handleButtonClick = () => {
    document.getElementById('hiddenFileInput').click();
  };

  return (
    <div className='w-full containerWhiter'>
      <div className="flex  justify-center items-center text-black  ">
        <form onSubmit={handleSubmit} className="w-full p-6 px-12 rounded-xl shadow-xl">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] xxxl:gap-12 md:gap-6 xl:gap-8 items-center">
        {/* photourl */}
          <div className="flex flex-col items-center w-full">
              <div className=' items-center gap-4 flex w-full'>
              <div className="w-12 sm:w-24 md:w-32 lg:w-40 aspect-square">
                <img className='rounded-xl object-cover w-full h-full ' src={preview == null ? defaultPhoto : preview}></img>
              </div>
                <button type="button" onClick={handleButtonClick} className="bg-white w-full rounded-xl mt-6 p-2 ">Choose File</button>
                <input id="hiddenFileInput" type="file" onChange={(e) => handleFileChange(e)} className="hidden"/>
        
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
                  Telephone
              </label>
              <input
                  type="text"
                  id="telephone"
                  name="telephone"
                  maxLength={20}
                  value={formData.telephone}
                  onChange={handleChange}
                  className="px-2 w-full outline-none text-center py-2  rounded-lg shadow-sm "
                  placeholder="Enter Phone"
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
            <div className="flex gap-2 w-40 items-center text-black ">
              {confirmDel == null && editAngajat == null ? 
                <button type="submit" className="bg-green-500 hover:bg-green-600 w-full  text-lg mt-6  justify-center py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/> Submit</button>
              :
              confirmDel != null ?
              <>
                <button onClick={(e) => deleteAngajat(confirmDel,e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-2 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faCancel} className="pr-3"/>Delete</button>
                <button onClick={(e) => cancelDel(e) } className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-2 py-2 flex  items-center rounded-lg">Cancel</button>
              </>
              :
              <>
                <button onClick={(e) => handleSubmit(e) } className="bg-green-500 hover:bg-green-600 text-black text-lg mt-6 px-2 py-2 flex  items-center rounded-lg"><FontAwesomeIcon icon={faPlus} className="pr-3"/>Submit</button>
                <button onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-black text-lg mt-6 px-2 py-2 flex  items-center rounded-lg"> Cancel</button>
              </>
            
              }     
            </div>
          </div>
        </form>
      </div>
      </div>
  );
}
