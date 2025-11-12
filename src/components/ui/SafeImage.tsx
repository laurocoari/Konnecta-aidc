import { useState } from "react";
import { Package, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  fallbackClassName?: string;
  onError?: () => void;
}

/**
 * Componente de imagem segura que trata erros 404 e URLs inválidas
 */
export function SafeImage({
  src,
  alt,
  className = "w-12 h-12 object-cover rounded",
  fallbackIcon,
  fallbackClassName,
  onError,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Se não há src ou já teve erro, mostrar fallback
  if (!src || hasError) {
    return (
      <div
        className={cn(
          "bg-muted rounded flex items-center justify-center",
          fallbackClassName || className
        )}
      >
        {fallbackIcon || <Package className="h-6 w-6 text-muted-foreground" />}
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={cn(className, isLoading && "opacity-0")}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          setHasError(true);
          setIsLoading(false);
          
          // Log do erro apenas em desenvolvimento
          if (import.meta.env.DEV) {
            console.warn(`[SafeImage] Erro ao carregar imagem: ${src}`);
          }
          
          if (onError) {
            onError();
          }
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
        loading="lazy"
      />
      {isLoading && (
        <div
          className={cn(
            "bg-muted rounded flex items-center justify-center animate-pulse",
            className
          )}
        >
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </>
  );
}

