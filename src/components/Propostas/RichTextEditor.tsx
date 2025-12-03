import { useRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VariableSelector } from "./VariableSelector";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  onVariableInsert?: (variable: string) => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite o conteúdo...",
  className = "",
  readOnly = false,
  onVariableInsert,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // Configurar toolbar customizada
  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        ["link", "image"],
        [{ align: [] }],
        ["clean"],
      ],
      handlers: {
        // Handler customizado será adicionado via ref
      },
    },
    clipboard: {
      matchVisual: false,
    },
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
    "align",
  ];

  const handleVariableInsert = (variable: string) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      const position = range ? range.index : quill.getLength();
      quill.insertText(position, `{{${variable}}}`, "user");
      quill.setSelection(position + variable.length + 4);
      
      if (onVariableInsert) {
        onVariableInsert(variable);
      }
    }
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <VariableSelector onSelect={handleVariableInsert} />
          )}
        </div>
      </div>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className="bg-background"
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: 200px;
          font-size: 14px;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          font-style: normal;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}



