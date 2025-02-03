import React, { useContext, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCancel, faMinus, faPlus, faTrash, faX } from "@fortawesome/free-solid-svg-icons";
import api from '../api/axiosAPI'
import { ArticlesContext } from "../context/ArticlesContext";

function HorizontalForm() {


  const {clicked, setArticles, setTotalItems, setOffset , offset, fetchSomeData, editArticle, setEditArticle} = useContext(ArticlesContext); 

  const [formData, setFormData] = useState({
    is: 1,
    code: "",
    description: "",
    unit: "unit1",
    norma: 0,
    data: "",
  });
  
  useEffect(() => {
    console.log("aici", editArticle)
    if(editArticle != null){
      console.log(editArticle);
      const date = new Date(editArticle.data);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateGood = `${year}-${month}-${day}`;
      setFormData({ 
        is: clicked, 
        code: editArticle.code,
        description: editArticle.description,
        unit: editArticle.unit,
        norma: editArticle.norma,
        data: dateGood,
      });
    }
    else setFormData({
      is: 1,
      code: "",
      description: "",
      unit: "unit1",
      norma: 0,
      data: "",
    });
    setFormData((prev) => ({ ...prev, is: clicked }));
  }, [clicked, editArticle])
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = (e) => {
    e.preventDefault();
    setFormData((prev) => ({     
      is: clicked,
      code: "",
      description: "",
      unit: "unit1",
      norma: 0,
      data: "", }));
    setEditArticle(null);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    let type = ['Category 1', 'Category 2', 'Category 3', 'Category 4'];
    console.log("formadataIS", formData.is);
    console.log(type[formData.is-1]);
    try {
        if(editArticle != null){
          let res = await api.post(`/articles/editArticle?id=${editArticle.id}`,{type:type[formData.is-1] ,description:formData.description, code:formData.code, unit:formData.unit, norma:formData.norma, data:formData.data})
          console.log(res);
          setEditArticle(null);
          setArticles(null);
          setTotalItems(0);
          fetchSomeData();
        }
        else{
          let res = await api.post(`/articles/add`,{type:type[formData.is-1] ,description:formData.description, code:formData.code, unit:formData.unit, norma:formData.norma, data:formData.data})
          console.log(res);
          setArticles(null);
          setTotalItems(0);
          if(offset != 0){  
            setOffset(0);
          }
          else fetchSomeData();
        }
        setFormData((prev) => ({     
          is: clicked,
          code: "",
          description: "",
          unit: "unit1",
          norma: 0,
          data: "", }));
    } catch (error) {
        console.log(error);
    }
  };

  return (
    <div className="flex justify-center items-center text-black  ">
      
      <form
        onSubmit={handleSubmit}
        className="w-full p-6 rounded-lg shadow-xl"
      >
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center">
            {/* de aici */}

          {/* Code Input */}
        <div className="flex flex-col items-center">
            <label htmlFor="code" className=" font-medium text-white">
                Code
            </label>
            <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="max-w-32 px-2 outline-none text-center py-2 border rounded-lg shadow-sm "
                placeholder="Enter code"
            />
        </div>
          {/* Description Input */}
          <div className="flex flex-col items-center">
            <label
                htmlFor="description"
                className=" font-medium text-white"
            >
                Description
            </label>
            <textarea
                
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className=" px-2 py-2 border w-full outline-none rounded-lg shadow-sm "
                placeholder="Enter description"
            />
        </div>
        <div className="flex flex-col items-center">
          {/* Unit Dropdown */}
          <label htmlFor="unit" className="col-span-1 font-medium text-white">
            Unit
          </label>
          <select
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="px-4 py-2 border rounded-lg outline-none shadow-sm "
          >
            <option value="unit1">Unit 1</option>
            <option value="unit2">Unit 2</option>
            <option value="unit3">Unit 3</option>
          </select>
          </div>
          {/* Norma Input */}
          <div className="flex flex-col items-center">
          <label
            htmlFor="norma"
            className="col-span-1 font-medium text-white"
          >
            Norma
          </label>
          <input
            type="number"
            id="norma"
            name="norma"
            value={formData.norma}
            onChange={handleChange}
            step={0.1}
            min={0}
            className="max-w-24  px-2 outline-none text-center py-2 border rounded-lg shadow-sm "
            
          />
            </div>
            <div className="flex flex-col items-center">
          {/* Data Input */}
          <label htmlFor="data" className="col-span-1 font-medium text-white">
            Data
          </label>
          <input
            type="date"
            id="data"
            name="data"
            value={formData.data}
            onChange={handleChange}
            className="col-span-2 px-4 outline-none py-2 border rounded-lg shadow-sm "
          />
   </div>
          {/* Submit Button */}
          <div className="flex gap-2 items-center ">
          <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white text-lg mt-6 px-6 py-2 rounded-lg"
            >
                <FontAwesomeIcon icon={faPlus} className="pr-3"/>
              Submit
            </button>
            {editArticle && <button onClick={(e) => cancelEdit(e)} className="bg-red-500 hover:bg-red-600 text-white text-lg mt-6 px-2 py-2 rounded-lg">
                <FontAwesomeIcon icon={faCancel} className="pr-3"/>
              Cancel
            </button>}
            </div>
        </div>
      </form>
    </div>
  );
}

export default HorizontalForm;
