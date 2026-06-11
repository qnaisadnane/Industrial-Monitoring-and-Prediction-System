import { Request, Response, NextFunction } from 'express';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ message: 'Accès refusé. Autorisations insuffisantes.' });
      return;
    }

    next();
  };
};
