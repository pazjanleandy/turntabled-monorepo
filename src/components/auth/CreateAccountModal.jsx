import SignUpModal from './SignUpModal.jsx'

export default function CreateAccountModal({ isOpen, onClose, onSignIn }) {
  return <SignUpModal isOpen={isOpen} onClose={onClose} onSignIn={onSignIn} />
}
