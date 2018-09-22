import React from 'react'
//import { isLengthyStringArray } from './../utils'

const emitTags = (onTags, e) => {
  if (e.key === 'Enter' || /^\s+$/.test(e.key)) {
    const tags = e.target.value.trim().split(/\s+/)
    if (typeof onTags === 'function' && tags.some(t => t.length)) onTags(tags)
    e.target.value = '';
  }
}

const TagInput = props =>
  <input onKeypress={ emitTags.bind(null, props.onTags) } />

const TagBoard = props =>
  <div>{ props.tags }</div> // TODO: allow a delete click handler

export TagInput
export TagBoard
