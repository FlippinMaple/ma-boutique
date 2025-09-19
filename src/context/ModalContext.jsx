import { createContext, useState, useContext } from 'react';
import ReactDOM from 'react-dom';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalContent, setModalContent] = useState(null);

  const openModal = (component) => setModalContent(component);
  const closeModal = () => setModalContent(null);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modalContent &&
        ReactDOM.createPortal(
          <div
            className="modal-overlay"
            onClick={closeModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                padding: '2rem',
                borderRadius: '8px',
                minWidth: '300px',
                maxWidth: '90vw',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
            >
              {modalContent}
            </div>
          </div>,
          document.body
        )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
