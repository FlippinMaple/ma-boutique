import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    return <Navigate to="/login" />;
  }

  // Si l'utilisateur est authentifié, afficher la page
  return element;
};

export default PrivateRoute;
