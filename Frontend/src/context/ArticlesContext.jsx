import React, { createContext, useEffect, useState } from "react";
import api from '../api/axiosAPI'

// Create the Context
const ArticlesContext = createContext();

// Create a Provider Component
const ArticlesProvider = ({ children }) => {

  
  const [clicked, setClicked] = useState(null);
  const [articles, setArticles] = useState(null);
  const [offset, setOffset] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10; // Number of items per page

  const [editArticle, setEditArticle] = useState(null);

  useEffect(() => {
    // Fetch data whenever offset changes
    console.log(clicked);
    if (clicked !== null) {
      setEditArticle(null);
      fetchSomeData();
    }
  }, [offset,clicked]); // Depend on offset and clicked category


  const fetchSomeData = async () => {
    console.log(offset);
    try {
      let types = ["Category 1", "Category 2", "Category 3", "Category 4"];
      const response = await api.get(`/articles/fetchArticles`, {
            params: { offset, limit, type:types[clicked-1] },
        });
        console.log(response);
        setArticles(response.data.data)
        setTotalItems(response.data.totalItems);
    } catch (err) {
        console.error('Error fetching data:', err);
    }
};

    const handleNext = () => {
      if (offset + limit < totalItems) {
          setOffset(offset + limit);
      }
    };

    const handlePrevious = () => {
        if (offset > 0) {
            setOffset(offset - limit);        }
    };



  const deleteArticle = async (id) =>{
    try {
        await api.delete(`/articles/delete?id=${id}`);
        setEditArticle(null);
        fetchSomeData();
    } catch (error) {
        console.log(error);
    }
  }

  return (
    <ArticlesContext.Provider value={{ clicked, setClicked, articles , setEditArticle, editArticle, setArticles,  handleNext , setTotalItems, deleteArticle, setOffset, handlePrevious, fetchSomeData , offset , totalItems }}>
      {children}
    </ArticlesContext.Provider>
  );
};

export { ArticlesContext, ArticlesProvider };
