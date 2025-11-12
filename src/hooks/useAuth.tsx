import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";

type UserRole = "admin" | "comercial" | "revendedor";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  const fetchUserRole = async (userId: string) => {
    try {
      logger.db(`Buscando role do usuário: ${userId}`);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        logger.error("AUTH", "Erro ao buscar role do usuário", error);
        return null;
      }
      
      logger.auth(`Role encontrado: ${data?.role} para usuário ${userId}`);
      return data?.role as UserRole;
    } catch (error) {
      logger.error("AUTH", "Erro ao buscar role do usuário", error);
      return null;
    }
  };

  useEffect(() => {
    logger.auth("Inicializando hook de autenticação");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.auth(`Auth state changed: ${event}`, {
          userId: session?.user?.id,
          email: session?.user?.email,
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserRole(session.user.id).then(role => {
            setUserRole(role);
            setLoading(false);
            logger.auth(`Usuário autenticado: ${session.user.email} (${role})`);
          });
        } else {
          setUserRole(null);
          setLoading(false);
          logger.auth("Usuário não autenticado");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.auth("Verificando sessão existente");
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(role => {
          setUserRole(role);
          setLoading(false);
          logger.auth(`Sessão encontrada: ${session.user.email} (${role})`);
        });
      } else {
        setUserRole(null);
        setLoading(false);
        logger.auth("Nenhuma sessão encontrada");
      }
    });

    return () => {
      logger.auth("Desmontando hook de autenticação");
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    logger.auth(`Logout iniciado para usuário: ${user?.email}`);
    await supabase.auth.signOut();
    logger.auth("Logout concluído, redirecionando para /auth");
    navigate("/auth");
  };

  return {
    user,
    session,
    loading,
    signOut,
    userRole,
  };
}
