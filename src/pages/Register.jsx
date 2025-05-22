import { useState } from 'react';
import axios from 'axios';
import './styles/Register.css';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;

    if (!form.name.trim()) newErrors.name = 'Le nom est requis.';
    if (!form.email.trim()) {
      newErrors.email = 'Le courriel est requis.';
    } else if (!emailRegex.test(form.email)) {
      newErrors.email = 'Courriel invalide.';
    }

    if (!form.password) {
      newErrors.password = 'Mot de passe requis.';
    } else if (!passwordRegex.test(form.password)) {
      newErrors.password =
        '8-16 caractères, une majuscule, un chiffre et un caractère spécial.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = await axios.post('http://localhost:4242/api/register', form);
      if (res.data.success) {
        setSuccess('Inscription réussie !');
        setForm({ name: '', email: '', password: '' });
        setErrors({});
      }
    } catch (err) {
      console.error(err);
      setErrors({ api: err.response?.data?.error || 'Erreur serveur.' });
    }
  };

  return (
    <div className="register-container">
      <h2>Créer un compte</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <label>
          Nom :
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>

        <label>
          Courriel :
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </label>

        <label>
          Mot de passe :
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </label>

        <button type="submit">S'inscrire</button>
        {errors.api && <div className="error api-error">{errors.api}</div>}
        {success && <div className="success">{success}</div>}
      </form>
    </div>
  );
};

export default Register;
