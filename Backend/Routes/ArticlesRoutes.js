const express = require('express');
const { getAllArticles, addArticle, getArticles, deleteArticle, editArticle} = require('../controllers/ArticlesController');


const router = express.Router();

// Define article routes
router.post('/fetchAllArticles', getAllArticles); // Fetch all articles
router.get('/fetchArticles', getArticles); // Fetch all articles
router.post('/add', addArticle);    // Add a new article
router.delete('/delete', deleteArticle);    // Add a new article
router.post('/editArticle', editArticle);    // Add a new article


module.exports = router;