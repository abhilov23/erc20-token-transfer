'use client';

import React from 'react';

type InputFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  large?: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  large = false,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full resize-none ${
          large ? 'h-24' : 'h-12'
        }`}
      />
    </div>
  );
};

export default InputField;
