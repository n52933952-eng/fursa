import { Box, VStack, Text, Input, Button, FormControl, FormLabel, Textarea, Select, HStack, Tag, TagCloseButton, TagLabel, useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function PostProject() {
  const [form, setForm] = useState({ title: '', description: '', category: '', budgetType: 'fixed', budget: '', deadline: '', skills: [] })
  const [skillInput, setSkillInput] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const addSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      setForm({ ...form, skills: [...form.skills, skillInput.trim()] })
      setSkillInput('')
    }
  }

  const removeSkill = (skill) => setForm({ ...form, skills: form.skills.filter(s => s !== skill) })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/project', form, { withCredentials: true })
      toast({ title: 'Project posted! / تم نشر المشروع!', status: 'success', duration: 3000 })
      navigate('/')
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed', status: 'error', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { bg: '#152438', border: '1px solid #2A4060', color: 'white', _hover: { border: '1px solid #FF6B35' }, _focus: { border: '1px solid #FF6B35', boxShadow: 'none' }, borderRadius: 'lg' }

  return (
    <Box maxW="700px" mx="auto">
      <Text color="white" fontSize="2xl" fontWeight="black" mb={6}>Post a Project / نشر مشروع</Text>
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
        <form onSubmit={handleSubmit}>
          <VStack spacing={5}>
            <FormControl isRequired>
              <FormLabel color="#8899AA" fontSize="sm">Project Title / عنوان المشروع</FormLabel>
              <Input {...inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Logo Design for Tech Startup" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="#8899AA" fontSize="sm">Category / الفئة</FormLabel>
              <Select {...inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category</option>
                {['Design', 'Development', 'Writing', 'Marketing', 'Video', 'Translation', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="#8899AA" fontSize="sm">Description / الوصف</FormLabel>
              <Textarea {...inputStyle} rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe your project in detail..." />
            </FormControl>

            <HStack w="full" spacing={4}>
              <FormControl isRequired>
                <FormLabel color="#8899AA" fontSize="sm">Budget Type / نوع الميزانية</FormLabel>
                <HStack>
                  {['fixed', 'hourly'].map(type => (
                    <Button key={type} flex={1} size="sm" borderRadius="lg"
                      bg={form.budgetType === type ? '#FF6B35' : '#152438'}
                      color={form.budgetType === type ? 'white' : '#8899AA'}
                      border="1px solid #2A4060" _hover={{ bg: '#FF6B35', color: 'white' }}
                      onClick={() => setForm({ ...form, budgetType: type })}>
                      {type === 'fixed' ? 'Fixed / ثابت' : 'Hourly / بالساعة'}
                    </Button>
                  ))}
                </HStack>
              </FormControl>
              <FormControl isRequired>
                <FormLabel color="#8899AA" fontSize="sm">Budget ($) / الميزانية</FormLabel>
                <Input {...inputStyle} type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="500" />
              </FormControl>
            </HStack>

            <FormControl isRequired>
              <FormLabel color="#8899AA" fontSize="sm">Deadline / الموعد النهائي</FormLabel>
              <Input {...inputStyle} type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </FormControl>

            <FormControl>
              <FormLabel color="#8899AA" fontSize="sm">Required Skills / المهارات المطلوبة</FormLabel>
              <Input {...inputStyle} value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={addSkill} placeholder="Type skill and press Enter..." />
              <HStack mt={2} flexWrap="wrap" spacing={2}>
                {form.skills.map(skill => (
                  <Tag key={skill} bg="#FF6B35" color="white" borderRadius="full" size="sm">
                    <TagLabel>{skill}</TagLabel>
                    <TagCloseButton onClick={() => removeSkill(skill)} />
                  </Tag>
                ))}
              </HStack>
            </FormControl>

            <Button type="submit" w="full" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} borderRadius="lg" py={6} isLoading={loading}>
              Post Project / نشر المشروع
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}
