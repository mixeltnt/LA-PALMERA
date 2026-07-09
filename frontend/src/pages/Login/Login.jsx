function Login() {
    return (
        <div className="container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">

            <div
                className="card shadow-lg p-5"
                style={{ width: "420px", borderRadius: "20px" }}
            >

                <div className="text-center mb-4">

                    <h1 style={{ fontSize: "60px" }}>🌴</h1>

                    <h2 className="fw-bold text-success">
                        LA PALMERA
                    </h2>

                    <p className="text-muted">
                        Sistema de Gestión para Minimarket
                    </p>

                </div>

                <div className="mb-3">
                    <label className="form-label">
                        Usuario
                    </label>

                    <input
                        className="form-control"
                        type="text"
                        placeholder="Ingrese su usuario"
                    />
                </div>

                <div className="mb-4">
                    <label className="form-label">
                        Contraseña
                    </label>

                    <input
                        className="form-control"
                        type="password"
                        placeholder="Ingrese su contraseña"
                    />
                </div>

                <button className="btn btn-success w-100">
                    Iniciar Sesión
                </button>

            </div>

        </div>
    );
}

export default Login;