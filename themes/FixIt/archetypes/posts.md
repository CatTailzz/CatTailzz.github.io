---
title: {{ replace .TranslationBaseName "-" " " | title }}
subtitle:
date: {{ .Date }}
slug: {{ substr .File.UniqueID 0 7 }}
tags:
  - draft
categories:
  - draft
collections:
  - draft

password:
message:
---


