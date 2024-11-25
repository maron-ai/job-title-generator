'use client'

import React, { useState, useRef } from "react"
import { useChat } from "ai/react"
import va from "@vercel/analytics"
import { LoadingCircle, SendIcon, ResetIcon } from "./icons"
import { Button } from "@repo/ui/components/ui/button";

import { Input } from "@repo/ui/components/ui/input"

export default function JobTitleChat() {
  const [showInput, setShowInput] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    onResponse: (response) => {
      if (response.status === 429) {
        va.track("Rate limited")
        return
      } else {
        va.track("Chat initiated")
        setShowInput(false)
      }
    },
    onError: (error) => {
      va.track("Chat errored", {
        input,
        error: error.message,
      })
    },
  })

  const disabled = isLoading || input.length === 0

  const handleReset = () => {
    setInput("")
    setShowInput(true)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {showInput ? (
        <div className="p-6">
          <h2 className="mb-4 text-xl font-medium text-center">Enter your current job title</h2>
          <form onSubmit={handleSubmit} className="relative">
            <Input
              ref={inputRef}
              placeholder="Software Engineer @ Company"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pr-12"
            />
            <Button
              type="submit"
              size="icon"
              disabled={disabled}
              className="absolute right-1 top-1 h-8 w-8 rounded-full"
            >
              {isLoading ? <LoadingCircle /> : <SendIcon className="h-4 w-4" />}
              <span className="sr-only">Submit</span>
            </Button>
          </form>
        </div>
      ) : (
        messages.length > 0 && (
          <div className="p-6">
            <h2 className="mb-4 text-xl font-medium text-center">Your new title is</h2>
            <div className="relative">
              <p className="text-lg pr-10">
              {messages.length > 0 ? messages[messages.length - 1]?.content : ''}
              </p>
              <Button
                onClick={handleReset}
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-8 w-8 rounded-full"
              >
                <ResetIcon className="h-4 w-4" />
                <span className="sr-only">Reset</span>
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

