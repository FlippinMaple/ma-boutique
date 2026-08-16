import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, User, Mail, Lock } from 'lucide-react';
import './styles/Register.css';
import { formatEmail, capitalizeSmart } from '../utils/textHelpers';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailMatch = email === confirmEmail && confirmEmail.length > 0;
  const passwordValid = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/.test(
    password
  );
  const passwordMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez entrer votre prénom et votre nom.');
      return false;
    }

    if (!emailValid || !emailMatch) {
      toast.error('Les adresses courriel doivent être valides et identiques.');
      return false;
    }

    if (!passwordValid || !passwordMatch) {
      toast.error(
        'Le mot de passe doit contenir 8 à 16 caractères, une majuscule, un chiffre et un caractère spécial, et être confirmé.'
      );
      return false;
    }

    if (!acceptedCGU) {
      toast('Vous devez accepter les CGU.', { icon: '📜' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register', {
        name: `${capitalizeSmart(firstName)} ${capitalizeSmart(
          lastName
        )}`.trim(),
        email: formatEmail(email),
        password,
        passwordConfirm: confirmPassword,
        marketingConsent
      });

      // Axios renvoie directement le JSON dans response.data

      toast.success(
        response.data?.message || 'Votre compte a été créé avec succès.'
      );
      setFirstName('');
      setLastName('');
      setEmail('');
      setConfirmEmail('');
      setPassword('');
      setConfirmPassword('');
      setAcceptedCGU(false);
      setMarketingConsent(false);

      setTimeout(() => {
        navigate('/login'); // ou '/dashboard' selon le flux désiré
      }, 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Erreur à la création du compte.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusIcon = (isValid, isDirty) => {
    if (!isDirty) return null;
    return isValid ? (
      <CheckCircle size={18} color="green" />
    ) : (
      <XCircle size={18} color="red" />
    );
  };

  return (
    <div className="register-container">
      <h2 className="form-title">Créer un compte</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <label>
          Prénom
          <div className="input-icon">
            <User size={18} />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="Jean"
            />
            {renderStatusIcon(
              firstName.trim().length > 0,
              firstName.length > 0
            )}
          </div>
        </label>

        <label>
          Nom
          <div className="input-icon">
            <User size={18} />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Dupont"
            />
            {renderStatusIcon(lastName.trim().length > 0, lastName.length > 0)}
          </div>
        </label>

        <label>
          Courriel
          <div className="input-icon">
            <Mail size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="exemple@email.com"
            />
            {renderStatusIcon(emailValid, email.length > 0)}
          </div>
        </label>

        <label>
          Confirmation du courriel
          <div className="input-icon">
            <Mail size={18} />
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              placeholder="Confirmez votre courriel"
            />
            {renderStatusIcon(emailMatch, confirmEmail.length > 0)}
          </div>
        </label>

        <label>
          Mot de passe
          <div className="input-icon">
            <Lock size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Mot de passe"
            />
            {renderStatusIcon(passwordValid, password.length > 0)}
          </div>
        </label>

        <label>
          Confirmation du mot de passe
          <div className="input-icon">
            <Lock size={18} />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirmez le mot de passe"
            />
            {renderStatusIcon(passwordMatch, confirmPassword.length > 0)}
          </div>
        </label>

        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={acceptedCGU}
            onChange={(e) => setAcceptedCGU(e.target.checked)}
          />
          J’accepte les&nbsp;
          <a href="/cgu" target="_blank" rel="noopener noreferrer">
            conditions générales d’utilisation
          </a>
          .
        </label>

        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
          />
          Je souhaite recevoir par courriel des nouvelles, nouveautés et offres
          de Flippin’ Maple.
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="spinner">
              <Loader2 size={18} className="spin" />
              &nbsp; Inscription...
            </span>
          ) : (
            "S'inscrire"
          )}
        </button>
      </form>
    </div>
  );
};

export default Register;
