export async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.code(401).send({
            message: "Giriş tələb olunur."
        });
    }
}
export function authorize(allowedRoles) {
    return async function checkRole(request, reply) {
        if (!request.user) {
            return reply.code(401).send({
                message: "Giriş tələb olunur."
            });
        }
        const role = request.user.role;
        if (!allowedRoles.includes(role)) {
            return reply.code(403).send({
                message: "Bu əməliyyat üçün icazəniz yoxdur."
            });
        }
    };
}
