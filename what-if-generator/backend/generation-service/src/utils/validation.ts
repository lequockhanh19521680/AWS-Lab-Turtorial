import Joi from 'joi'

export const generateSchema = Joi.object({
  topic: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Chủ đề phải có ít nhất 3 ký tự',
      'string.max': 'Chủ đề không được vượt quá 200 ký tự',
      'any.required': 'Chủ đề là bắt buộc'
    })
})