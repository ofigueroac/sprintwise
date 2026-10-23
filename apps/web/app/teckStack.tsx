'use client'

import Image from 'next/image'
import { motion } from 'motion/react'

import { stacks } from './stacks'
import styles from './teckStack.module.css'

const list = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export function TechStack() {
  return (
    <motion.ul
      className={styles.list}
      variants={list}
      initial="hidden"
      animate="show"
    >
      {stacks.map((stack) => (
        <motion.li
          key={stack.name}
          className={styles.item}
          tabIndex={0}
          variants={item}
        >
          <span className={styles.name} aria-hidden="true">
            {stack.name}
          </span>
          <span
            className={
              stack.onDark
                ? `${styles.plate} ${styles.plateDark}`
                : styles.plate
            }
          >
            <Image
              src={stack.src}
              unoptimized={stack.src.endsWith('.svg')}
              alt={stack.name}
              width={64}
              height={64}
              className={styles.icon}
            />
          </span>
        </motion.li>
      ))}
    </motion.ul>
  )
}
