import { Link } from "react-router-dom";

function NotFound() {
    return (
        <div>
            <h1>Stranica nije pronađena</h1>
            <Link to="/">Home</Link>
        </div>
    );
}

export default NotFound;
