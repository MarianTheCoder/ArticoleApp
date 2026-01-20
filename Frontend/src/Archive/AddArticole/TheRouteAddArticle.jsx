import React from 'react'
import { ArticlesProvider } from '../../context/ArticlesContext'
import MainCategories from './MainCategories'

export default function TheRouteAddArticle() {
  return (
    <ArticlesProvider>
      <MainCategories />
    </ArticlesProvider>
  )
}
