import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Landing from './pages/Landing.jsx'
import Profile from './pages/Profile.jsx'
import ArtistProfile from './pages/ArtistProfile.jsx'
import Explore from './pages/Explore.jsx'
import Backlog from './pages/Backlog.jsx'
import Favorites from './pages/Favorites.jsx'
import Activity from './pages/Activity.jsx'
import Friends from './pages/Friends.jsx'
import Artists from './pages/Artists.jsx'
import LastFmCallbackPage from './pages/LastFmCallbackPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/auth/lastfm/callback" element={<LastFmCallbackPage />} />
        <Route path="/artist/:artistId" element={<ArtistProfile />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
