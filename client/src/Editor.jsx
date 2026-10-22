import ReactQuill from "react-quill";

// Only offer formatting the server's sanitizer keeps. Inline images and indents
// are left out: embedded images are stripped on save, and indents need extra styling.
export default function Editor({value,onChange}) {
  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [
        { list: 'ordered' },
        { list: 'bullet' },
      ],
      ['link'],
      ['clean'],
    ],
  };

  // Also limits pasted content, so images or indents can't come in via paste.
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link',
  ];

  return (
    <div className="content">
    <ReactQuill
      value={value}
      theme={'snow'}
      onChange={onChange}
      modules={modules}
      formats={formats} />
    </div>
  );
}
